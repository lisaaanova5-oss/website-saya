module.exports = function wajibLogin(req, res, next) {
  if (!req.session.idPetugas) {
    return res.redirect('/login');
  }
  next();
};