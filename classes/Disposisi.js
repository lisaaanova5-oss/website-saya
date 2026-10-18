const Database = require('../config/database');

class Disposisi {
  #db() {
    return Database.getPool();
  }

  async ambilSemua(keyword = '') {
    const like = '%' + keyword + '%';
    const [rows] = await this.#db().query(
      `SELECT d.*, s.jenis, s.nomor_surat, s.perihal
       FROM disposisi d
       JOIN surat s ON s.id_surat = d.id_surat
       WHERE s.nomor_surat LIKE ? OR d.tujuan LIKE ? OR s.perihal LIKE ?
       ORDER BY d.id_disposisi DESC`,
      [like, like, like]
    );
    return rows;
  }

  async daftarSurat() {
    const [rows] = await this.#db().query(
      `SELECT id_surat, jenis, nomor_surat, perihal
       FROM surat ORDER BY tanggal DESC, id_surat DESC`
    );
    return rows;
  }

  // Membuat disposisi dan mengubah status surat dalam satu transaksi
  async buat(idSurat, tujuan, catatan, tanggal) {
    const conn = await this.#db().getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        'INSERT INTO disposisi (id_surat, tujuan, catatan, tanggal_disposisi) VALUES (?, ?, ?, ?)',
        [idSurat, tujuan, catatan || null, tanggal]
      );
      await conn.query(
        "UPDATE surat SET status = 'Diproses' WHERE id_surat = ? AND status = 'Menunggu'",
        [idSurat]
      );
      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async ubahStatus(idDisposisi, status) {
    if (!['Menunggu', 'Diproses', 'Selesai'].includes(status)) {
      throw new Error('Status disposisi tidak valid.');
    }
    await this.#db().query(
      'UPDATE disposisi SET status = ? WHERE id_disposisi = ?',
      [status, idDisposisi]
    );
    const [rows] = await this.#db().query(
      'SELECT id_surat FROM disposisi WHERE id_disposisi = ?',
      [idDisposisi]
    );
    // Status surat mengikuti status disposisi (Diproses/Selesai)
    if (rows[0] && status !== 'Menunggu') {
      await this.#db().query(
        'UPDATE surat SET status = ? WHERE id_surat = ?',
        [status, rows[0].id_surat]
      );
    }
    return true;
  }

  async pantauStatus(keyword = '') {
    const like = '%' + keyword + '%';
    const [rows] = await this.#db().query(
      `SELECT s.id_surat, s.jenis, s.nomor_surat, s.perihal, s.tanggal, s.status,
              (SELECT d.tujuan FROM disposisi d WHERE d.id_surat = s.id_surat
               ORDER BY d.id_disposisi DESC LIMIT 1) AS tujuan_terakhir,
              (SELECT COUNT(*) FROM disposisi d WHERE d.id_surat = s.id_surat) AS jumlah_disposisi
       FROM surat s
       WHERE s.nomor_surat LIKE ? OR s.perihal LIKE ? OR s.pengirim_tujuan LIKE ?
       ORDER BY s.tanggal DESC, s.id_surat DESC`,
      [like, like, like]
    );
    return rows;
  }

  async riwayat(idSurat) {
    const [rows] = await this.#db().query(
      'SELECT * FROM disposisi WHERE id_surat = ? ORDER BY id_disposisi DESC',
      [idSurat]
    );
    return rows;
  }
}

module.exports = Disposisi;