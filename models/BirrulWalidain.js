const mongoose = require('mongoose');

const birrulWalidainSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    siswa: { type: mongoose.Schema.Types.ObjectId, ref: 'Siswa', required: true, index: true },
    tanggal: { type: String, required: true },
    tempat: { type: String, trim: true, default: '' },
    kegiatan: { type: String, required: true, trim: true },
    hafalanSurah: { type: String, trim: true, default: '' },
    bacaBuku: { type: String, trim: true, default: '' },
    lainLain: { type: String, trim: true, default: '' },
    catatan: { type: String, trim: true, default: '' },
    statusApproval: { type: Boolean, default: false },
  },
  { timestamps: true }
);

birrulWalidainSchema.index({ siswa: 1, tanggal: -1 });

module.exports = mongoose.model('BirrulWalidain', birrulWalidainSchema);
