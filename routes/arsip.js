const express = require('express');
const Arsip = require('../classes/Arsip');
const wajibLogin = require('../middleware/wajiblogin');

const router = express.Router();
const arsip = new Arsip();

router.use('/arsip', wajibLogin);

router.get('/arsip', async (req, res, next) => {
  try {
    const keyword = (req.query.q || '').trim();
    const daftar = await arsip.ambilSemua(keyword);
    const belum = await arsip.suratBelumDiarsipkan();

    const pesan = req.session.pesan || '';
    delete req.session.pesan;

    res.render('arsip', {
      nama: req.session.nama, aktif: 'arsip', keyword, daftar, belum, pesan,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/arsip', async (req, res, next) => {
  try {
    const { aksi, id_surat, id_arsip } = req.body;
    if (aksi === 'simpan') {
      await arsip.simpan(parseInt(id_surat, 10));
      req.session.pesan = 'Surat berhasil disimpan ke arsip.';
    } else if (aksi === 'hapus') {
      await arsip.hapus(parseInt(id_arsip, 10));
      req.session.pesan = 'Arsip berhasil dihapus dari daftar arsip.';
    }
    res.redirect('/arsip');
  } catch (err) {
    if (err.message.startsWith('Surat ini')) {
      req.session.pesan = err.message;
      return res.redirect('/arsip');
    }
    next(err);
  }
});

module.exports = router;