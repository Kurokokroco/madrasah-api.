const mongoose = require('mongoose');

const siswaSchema = new mongoose.Schema(
  {
    idSiswa: { type: Number, required: true, unique: true }, // ID angka untuk aplikasi Android (header id_siswa)
    nama: { type: String, required: true, trim: true },
    nis: { type: String, required: true, unique: true },
    kelas: { type: String, required: true },
    jenisKelamin: { type: String, enum: ['L', 'P'], required: true },
    foto: { type: String, default: '' },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Siswa', siswaSchema);
