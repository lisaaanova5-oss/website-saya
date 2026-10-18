const express = require('express');
const Petugas = require('../classes/Petugas');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.idPetugas) return res.redirect('/dashboard');
  res.render('login', { error: '' });
});

router.post('/login', async (req, res, next) => {
  try {
    const petugas = new Petugas();
    const { username, password } = req.body;
    if (await petugas.login(username, password)) {
      req.session.idPetugas = petugas.id;
      req.session.nama = petugas.nama;
      return res.redirect('/dashboard');
    }
    res.render('login', { error: 'Username atau password salah.' });
  } catch (err) {
    next(err);
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;