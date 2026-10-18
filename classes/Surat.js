const fs = require('fs');
const path = require('path');
const Database = require('../config/database');

class Surat {
  #folderUpload = path.join(__dirname, '..', 'uploads');

  #db() {
    return Database.getPool();
  }

  #hapusFile(nama) {
    if (!nama) return;
    fs.unlink(path.join(this.#folderUpload, nama), () => {});
  }

  async ambilSemua(jenis, keyword = '') {
    const like = '%' + keyword + '%';
    const [rows] = await this.#db().query(
      `SELECT * FROM surat WHERE jenis = ?
       AND (nomor_surat LIKE ? OR pengirim_tujuan LIKE ? OR perihal LIKE ?)
       ORDER BY tanggal DESC, id_surat DESC`,
      [jenis, like, like, like]
    );
    return rows;
  }

  async ambilSatu(id) {
    const [rows] = await this.#db().query('SELECT * FROM surat WHERE id_surat = ?', [id]);
    return rows[0] || null;
  }

  async tambah({ jenis, nomor, pihak, tanggal, perihal, status, dokumen, idPetugas }) {
    await this.#db().query(
      `INSERT INTO surat (jenis, nomor_surat, pengirim_tujuan, tanggal, perihal, status, file_dokumen, id_petugas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [jenis, nomor, pihak, tanggal, perihal, status, dokumen, idPetugas]
    );
    return true;
  }

  async ubah(id, { nomor, pihak, tanggal, perihal, status, dokumen }) {
    const lama = await this.ambilSatu(id);
    let fileFinal = lama.file_dokumen;
    if (dokumen) {
      this.#hapusFile(lama.file_dokumen);
      fileFinal = dokumen;
    }
    await this.#db().query(
      `UPDATE surat SET nomor_surat=?, pengirim_tujuan=?, tanggal=?, perihal=?, status=?, file_dokumen=?
       WHERE id_surat=?`,
      [nomor, pihak, tanggal, perihal, status, fileFinal, id]
    );
    return true;
  }

  async hapus(id) {
    const lama = await this.ambilSatu(id);
    await this.#db().query('DELETE FROM surat WHERE id_surat = ?', [id]);
    if (lama) this.#hapusFile(lama.file_dokumen);
    return true;
  }
}

module.exports = Surat;