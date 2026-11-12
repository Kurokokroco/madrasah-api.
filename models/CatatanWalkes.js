const mongoose = require('mongoose');

const catatanWalkesSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    id_siswa: { type: Number, required: true, index: true },
    tanggal: { type: String, required: true },
    mapel: { type: String, trim: true, default: 'Umum' },
    catatan: { type: String, required: true, trim: true },
    seedKey: { type: String, unique: true, sparse: true, select: false },
  },
  { timestamps: true, collection: 'catatan_walkes' }
);

catatanWalkesSchema.index({ id_siswa: 1, tanggal: -1 });

module.exports = mongoose.model('CatatanWalkes', catatanWalkesSchema);
