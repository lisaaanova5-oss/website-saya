const bcrypt = require('bcryptjs');
const Database = require('../config/database');

class Petugas {
  #id = null;
  #nama = null;
  #username = null;

  // Getter: atribut private diakses lewat method (encapsulation)
  get id() { return this.#id; }
  get nama() { return this.#nama; }
  get username() { return this.#username; }

  async login(username, password) {
    const [rows] = await Database.getPool().query(
      'SELECT id_petugas, nama, username, password FROM petugas WHERE username = ?',
      [username]
    );
    const hasil = rows[0];
    if (hasil && (await bcrypt.compare(password, hasil.password))) {
      this.#id = hasil.id_petugas;
      this.#nama = hasil.nama;
      this.#username = hasil.username;
      return true;
    }
    return false;
  }

  static async buatAkun(nama, username, password) {
    const hash = await bcrypt.hash(password, 10);
    await Database.getPool().query(
      'INSERT INTO petugas (nama, username, password) VALUES (?, ?, ?)',
      [nama, username, hash]
    );
    return true;
  }
}

module.exports = Petugas;