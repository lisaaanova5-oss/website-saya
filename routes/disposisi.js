const express = require('express');
const Disposisi = require('../classes/Disposisi');
const Surat = require('../classes/Surat');
const wajibLogin = require('../middleware/wajiblogin');

const router = express.Router();
const disposisi = new Disposisi();
const surat = new Surat();

const STATUS = ['Menunggu', 'Diproses', 'Selesai'];

router.use(['/disposisi', '/status'], wajibLogin);

function ambilPesan(req) {
  const p = req.session.pesan || '';
  delete req.session.pesan;
  return p;
}

// Halaman disposisi
router.get('/disposisi', async (req, res, next) => {
  try {
    const keyword = (req.query.q || '').trim();
    const daftar = await disposisi.ambilSemua(keyword);
    const daftarSurat = await disposisi.daftarSurat();
    res.render('disposisi', {
      nama: req.session.nama, aktif: 'disposisi', keyword, daftar, daftarSurat,
      statusList: STATUS, pesan: ambilPesan(req),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/disposisi', async (req, res, next) => {
  try {
    const { aksi } = req.body;

    if (aksi === 'buat') {
      const idSurat = parseInt(req.body.id_surat, 10) || 0;
      const tujuan = (req.body.tujuan || '').trim();
      const catatan = (req.body.catatan || '').trim();
      const tanggal = req.body.tanggal || '';

      if (!idSurat || !tujuan || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
        req.session.pesan = 'Surat, tujuan, dan tanggal disposisi wajib diisi.';
      } else {
        await disposisi.buat(idSurat, tujuan, catatan, tanggal);
        req.session.pesan = 'Disposisi berhasil dibuat.';
      }
    } else if (aksi === 'ubah_status') {
      const status = req.body.status;
      if (!STATUS.includes(status)) {
        req.session.pesan = 'Status disposisi tidak valid.';
      } else {
        await disposisi.ubahStatus(parseInt(req.body.id_disposisi, 10), status);
        req.session.pesan = 'Status disposisi berhasil diperbarui.';
      }
    }
    res.redirect('/disposisi');
  } catch (err) {
    next(err);
  }
});

// Halaman status surat
router.get('/status', async (req, res, next) => {
  try {
    const keyword = (req.query.q || '').trim();
    const daftar = await disposisi.pantauStatus(keyword);

    const idLihat = parseInt(req.query.id, 10) || 0;
    const suratLihat = idLihat ? await surat.ambilSatu(idLihat) : null;
    const riwayat = suratLihat ? await disposisi.riwayat(idLihat) : [];

    res.render('status_surat', {
      nama: req.session.nama, aktif: 'status', keyword, daftar, suratLihat, riwayat,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;