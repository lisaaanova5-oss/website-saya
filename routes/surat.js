const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Surat = require('../classes/Surat');
const wajibLogin = require('../middleware/wajiblogin');

const router = express.Router();
const surat = new Surat();

const STATUS = ['Menunggu', 'Diproses', 'Terkirim', 'Selesai'];
const FORMAT = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', 'uploads'),
    filename: (req, file, cb) =>
      cb(null, 'surat_' + crypto.randomBytes(8).toString('hex') + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (FORMAT.includes(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new Error('Format dokumen harus PDF, JPG, PNG, DOC, atau DOCX.'));
  },
});

// Menangkap error unggah supaya bisa ditampilkan di form
function unggah(req, res, next) {
  upload.single('dokumen')(req, res, (err) => {
    if (err) {
      req.errorUnggah = err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran dokumen maksimal 5 MB.' : err.message;
    }
    next();
  });
}

const validJenis = (j) => j === 'masuk' || j === 'keluar';

function buangFile(req) {
  if (req.file) fs.unlink(req.file.path, () => {});
}

function ambilPesan(req) {
  const p = req.session.pesan || '';
  delete req.session.pesan;
  return p;
}

function bacaForm(body) {
  const b = body || {};
  return {
    nomor_surat: (b.nomor_surat || '').trim(),
    pengirim_tujuan: (b.pengirim_tujuan || '').trim(),
    tanggal: b.tanggal || '',
    perihal: (b.perihal || '').trim(),
    status: b.status || 'Menunggu',
  };
}

function validasi(d) {
  if (!d.nomor_surat || !d.pengirim_tujuan || !d.tanggal || !d.perihal) return 'Semua kolom wajib diisi.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.tanggal)) return 'Format tanggal tidak valid.';
  if (!STATUS.includes(d.status)) return 'Status tidak valid.';
  return '';
}

function tampilForm(req, res, { jenis, id, data, error }) {
  res.render('surat_form', {
    nama: req.session.nama, aktif: jenis, jenis, id, data, error, statusList: STATUS,
  });
}

router.use('/surat', wajibLogin);

// Daftar surat
router.get('/surat/:jenis', async (req, res, next) => {
  try {
    const { jenis } = req.params;
    if (!validJenis(jenis)) return next();
    const keyword = (req.query.q || '').trim();
    const daftar = await surat.ambilSemua(jenis, keyword);
    res.render('surat', {
      nama: req.session.nama, aktif: jenis, jenis, keyword, daftar, pesan: ambilPesan(req),
    });
  } catch (err) {
    next(err);
  }
});

// Form tambah
router.get('/surat/:jenis/tambah', (req, res, next) => {
  const { jenis } = req.params;
  if (!validJenis(jenis)) return next();
  tampilForm(req, res, {
    jenis, id: null, error: '',
    data: { nomor_surat: '', pengirim_tujuan: '', tanggal: new Date(), perihal: '', status: 'Menunggu', file_dokumen: null },
  });
});

// Simpan surat baru
router.post('/surat/:jenis/tambah', unggah, async (req, res, next) => {
  const { jenis } = req.params;
  if (!validJenis(jenis)) {
    buangFile(req);
    return next();
  }
  try {
    const data = bacaForm(req.body);
    const error = req.errorUnggah || validasi(data);
    if (error) {
      buangFile(req);
      return tampilForm(req, res, { jenis, id: null, data: { ...data, file_dokumen: null }, error });
    }
    await surat.tambah({
      jenis, nomor: data.nomor_surat, pihak: data.pengirim_tujuan, tanggal: data.tanggal,
      perihal: data.perihal, status: data.status,
      dokumen: req.file ? req.file.filename : null,
      idPetugas: req.session.idPetugas,
    });
    req.session.pesan = 'Surat berhasil ditambahkan.';
    res.redirect('/surat/' + jenis);
  } catch (err) {
    buangFile(req);
    next(err);
  }
});

// Form edit
router.get('/surat/edit/:id', async (req, res, next) => {
  try {
    const row = await surat.ambilSatu(req.params.id);
    if (!row) return res.redirect('/dashboard');
    tampilForm(req, res, { jenis: row.jenis, id: row.id_surat, data: row, error: '' });
  } catch (err) {
    next(err);
  }
});

// Simpan perubahan
router.post('/surat/edit/:id', unggah, async (req, res, next) => {
  try {
    const row = await surat.ambilSatu(req.params.id);
    if (!row) {
      buangFile(req);
      return res.redirect('/dashboard');
    }
    const data = bacaForm(req.body);
    const error = req.errorUnggah || validasi(data);
    if (error) {
      buangFile(req);
      return tampilForm(req, res, {
        jenis: row.jenis, id: row.id_surat, data: { ...data, file_dokumen: row.file_dokumen }, error,
      });
    }
    await surat.ubah(row.id_surat, {
      nomor: data.nomor_surat, pihak: data.pengirim_tujuan, tanggal: data.tanggal,
      perihal: data.perihal, status: data.status,
      dokumen: req.file ? req.file.filename : null,
    });
    req.session.pesan = 'Data surat berhasil diperbarui.';
    res.redirect('/surat/' + row.jenis);
  } catch (err) {
    buangFile(req);
    next(err);
  }
});

// Hapus surat
router.post('/surat/hapus/:id', async (req, res, next) => {
  try {
    const row = await surat.ambilSatu(req.params.id);
    if (!row) return res.redirect('/dashboard');
    await surat.hapus(row.id_surat);
    req.session.pesan = 'Surat berhasil dihapus.';
    res.redirect('/surat/' + row.jenis);
  } catch (err) {
    next(err);
  }
});

module.exports = router;