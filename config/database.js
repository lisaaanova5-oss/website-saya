const mysql = require('mysql2/promise');

class Database {
  static #pool = null;

  static getPool() {
    if (!Database.#pool) {
      Database.#pool = mysql.createPool({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'unimarch',
        charset: 'utf8mb4',
      });
    }
    return Database.#pool;
  }
}

module.exports = Database;