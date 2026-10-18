const express = require('express');
const Database = require('../config/database');
const wajibLogin = require('../middleware/wajiblogin');

const router = express.Router();

router.get('/dashboard', wajibLogin, async (req, res, next) => {
  try {
    const db = Database.getPool();
    const hitung = async (sql) => (await db.query(sql))[0][0].n;

    const masuk = await hitung("SELECT COUNT(*) AS n FROM surat WHERE jenis='masuk'");
    const keluar = await hitung("SELECT COUNT(*) AS n FROM surat WHERE jenis='keluar'");
    const disposisi = await hitung('SELECT COUNT(*) AS n FROM disposisi');
    const arsip = await hitung('SELECT COUNT(*) AS n FROM arsip');

    const [terbaru] = await db.query(
      'SELECT jenis, nomor_surat, perihal, tanggal, status FROM surat ORDER BY id_surat DESC LIMIT 5'
    );

    res.render('dashboard', {
      nama: req.session.nama,
      aktif: 'dashboard',
      masuk, keluar, disposisi, arsip, terbaru,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;