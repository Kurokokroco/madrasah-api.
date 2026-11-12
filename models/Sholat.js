const mongoose = require('mongoose');

const flag = { type: Boolean, default: false };

const sholatSchema = new mongoose.Schema(
  {
    siswa: { type: mongoose.Schema.Types.ObjectId, ref: 'Siswa', required: true },
    tanggal: { type: String, required: true }, // format YYYY-MM-DD
    dilihatWalkes: flag,
    subuh: flag,
    dhuhur: flag,
    ashar: flag,
    maghrib: flag,
    isya: flag,
    dhuha: flag,
    tahajjud: flag,
    qobliyah: flag,
    badiyah: flag,
  },
  { timestamps: true }
);

sholatSchema.index({ siswa: 1, tanggal: 1 }, { unique: true });

module.exports = mongoose.model('Sholat', sholatSchema);
