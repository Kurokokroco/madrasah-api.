const mongoose = require('mongoose');

const tahfidzSchema = new mongoose.Schema(
  {
    siswa: { type: mongoose.Schema.Types.ObjectId, ref: 'Siswa', required: true, index: true },
    tanggal: { type: String, required: true },
    juz: { type: String, default: '' },
    surah: { type: String, default: '' },
    ayat: { type: String, default: '' },
    guru: { type: String, default: '' },
    ttd: { type: String, default: '' },
    keterangan: { type: String, default: '' },
  },
  { timestamps: true }
);

tahfidzSchema.index({ siswa: 1, tanggal: -1 });

module.exports = mongoose.model('Tahfidz', tahfidzSchema);
