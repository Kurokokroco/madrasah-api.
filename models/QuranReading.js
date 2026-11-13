const mongoose = require('mongoose');

const quranReadingSchema = new mongoose.Schema(
  {
    siswa: { type: mongoose.Schema.Types.ObjectId, ref: 'Siswa', required: true, index: true },
    tanggal: { type: String, required: true },
    juz: { type: String, default: '' },
    surah: { type: String, default: '' },
    ayat: { type: String, default: '' },
    halaman: { type: String, default: '' },
    ustad: { type: String, default: '' },
    keterangan: { type: String, default: '' },
    ttd: { type: Boolean, default: false },
  },
  { timestamps: true }
);

quranReadingSchema.index({ siswa: 1, tanggal: -1 });

module.exports = mongoose.model('QuranReading', quranReadingSchema);
