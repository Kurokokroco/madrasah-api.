require('dotenv').config();
const mongoose = require('mongoose');
const CatatanWalkes = require('../models/CatatanWalkes');
const Counter = require('../models/Counter');
const Siswa = require('../models/Siswa');
const { daysAgo } = require('../utils/date');

const siswaId = Number(process.env.CATATAN_WALKES_SISWA_ID);

if (!process.env.MONGODB_URI || !Number.isSafeInteger(siswaId) || siswaId <= 0) {
  console.error('MONGODB_URI dan CATATAN_WALKES_SISWA_ID yang valid wajib diisi');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  console.error('Dummy data ditolak di production. Set ALLOW_DEMO_SEED=true hanya jika memang disengaja.');
  process.exit(1);
}

const nextCatatanId = async () => {
  const counter = await Counter.findByIdAndUpdate(
    'catatan-walkes',
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter.seq;
};

const samples = [
  { daysAgo: 0, mapel: 'Matematika', catatan: 'Contoh catatan: siswa mengikuti pelajaran dengan baik.' },
  { daysAgo: 1, mapel: 'Bahasa Indonesia', catatan: 'Contoh catatan: tugas harian telah dikumpulkan.' },
  { daysAgo: 2, mapel: 'Umum', catatan: 'Contoh catatan: siswa menunjukkan sikap yang baik di kelas.' },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const siswa = await Siswa.findOne({ idSiswa: siswaId });
  if (!siswa) {
    throw new Error(`Siswa dengan id_siswa ${siswaId} tidak ditemukan`);
  }

  let inserted = 0;
  for (const [index, sample] of samples.entries()) {
    const seedKey = `demo-catatan-walkes-${siswaId}-${index + 1}`;
    const exists = await CatatanWalkes.exists({ seedKey });
    if (exists) continue;

    await CatatanWalkes.create({
      id: await nextCatatanId(),
      id_siswa: siswaId,
      tanggal: daysAgo(sample.daysAgo),
      mapel: sample.mapel,
      catatan: sample.catatan,
      seedKey,
    });
    inserted += 1;
  }

  console.log(`Ditambahkan ${inserted} catatan contoh untuk siswa ${siswaId}.`);
};

seed()
  .catch((err) => {
    console.error('Gagal menambahkan data contoh:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
