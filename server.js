const express = require('express');
const session = require('express-session');
const path = require('path');
const tampilan = require('./helpers/tampilan');
const wajibLogin = require('./middleware/wajiblogin');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Fungsi bantu yang bisa dipakai di semua tampilan
app.locals.ikon = tampilan.ikon;
app.locals.tgl = tampilan.tgl;
app.locals.ucfirst = tampilan.ucfirst;
app.locals.tglInput = tampilan.tglInput;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'unimarch-rahasia',
  resave: false,
  saveUninitialized: false,
}));

// Dokumen surat hanya bisa dibuka setelah login
app.use('/uploads', wajibLogin, express.static(path.join(__dirname, 'uploads')));

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/surat'));
app.use('/', require('./routes/arsip'));
app.use('/', require('./routes/disposisi'));
app.get('/', (req, res) => res.redirect('/dashboard'));

app.listen(PORT, () => {
  console.log('Server berjalan di http://localhost:' + PORT);
});