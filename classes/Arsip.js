const Database = require('../config/database');

class Arsip {
  #db() {
    return Database.getPool();
  }

  async ambilSemua(keyword = '') {
    const like = '%' + keyword + '%';
    const [rows] = await this.#db().query(
      `SELECT a.id_arsip, a.dokumen, a.tanggal_simpan,
              s.jenis, s.nomor_surat, s.pengirim_tujuan, s.tanggal, s.perihal
       FROM arsip a
       JOIN surat s ON s.id_surat = a.id_surat
       WHERE s.nomor_surat LIKE ? OR s.pengirim_tujuan LIKE ? OR s.perihal LIKE ?
       ORDER BY a.tanggal_simpan DESC`,
      [like, like, like]
    );
    return rows;
  }

  // Surat yang punya dokumen tetapi belum masuk arsip
  async suratBelumDiarsipkan() {
    const [rows] = await this.#db().query(
      `SELECT id_surat, jenis, nomor_surat, perihal
       FROM surat
       WHERE file_dokumen IS NOT NULL
         AND id_surat NOT IN (SELECT id_surat FROM arsip)
       ORDER BY tanggal DESC`
    );
    return rows;
  }

  async simpan(idSurat) {
    const [rows] = await this.#db().query(
      'SELECT file_dokumen FROM surat WHERE id_surat = ?', [idSurat]
    );
    if (!rows[0] || !rows[0].file_dokumen) {
      throw new Error('Surat ini belum memiliki dokumen.');
    }
    const [cek] = await this.#db().query(
      'SELECT id_arsip FROM arsip WHERE id_surat = ?', [idSurat]
    );
    if (cek.length > 0) {
      throw new Error('Surat ini sudah ada di arsip.');
    }
    await this.#db().query(
      'INSERT INTO arsip (id_surat, dokumen) VALUES (?, ?)',
      [idSurat, rows[0].file_dokumen]
    );
    return true;
  }

  // Menghapus dari arsip saja; data surat dan dokumennya tetap ada
  async hapus(idArsip) {
    await this.#db().query('DELETE FROM arsip WHERE id_arsip = ?', [idArsip]);
    return true;
  }
}

module.exports = Arsip;