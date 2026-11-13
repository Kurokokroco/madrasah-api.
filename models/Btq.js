const mongoose = require('mongoose');

const penilaianSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    nilai: { type: Number, required: true },
    tanggal: { type: String, default: null },
    disetujui: { type: Boolean, default: false },
    catatan: { type: String, default: null },
    namaGuru: { type: String, default: null },
  },
  { _id: false }
);

const materiSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    judul: { type: String, required: true },
    tipeMateri: { type: String, required: true },
    deskripsi: { type: String, default: null },
    semester: { type: String, default: null },
    penilaian: { type: penilaianSchema, default: null },
  },
  { _id: false }
);

const btqSchema = new mongoose.Schema(
  {
    siswa: { type: mongoose.Schema.Types.ObjectId, ref: 'Siswa', required: true, index: true },
    idKelas: { type: Number, required: true },
    namaKelas: { type: String, required: true },
    tahunAjaran: { type: String, required: true },
    sedangAktif: { type: Boolean, default: true },
    materi: { type: [materiSchema], default: [] },
  },
  { timestamps: true }
);

btqSchema.index({ siswa: 1, idKelas: 1 }, { unique: true });

module.exports = mongoose.model('Btq', btqSchema);
