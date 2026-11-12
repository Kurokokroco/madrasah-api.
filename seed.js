require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Siswa = require('./models/Siswa');
const Sholat = require('./models/Sholat');
const { daysAgo } = require('./utils/date');

const pick = () => Math.random() < 0.8;
const seedPassword = process.env.SEED_PARENT_PASSWORD;

if (!process.env.MONGODB_URI || !seedPassword) {
  console.error('MONGODB_URI dan SEED_PARENT_PASSWORD wajib diisi di environment variable');
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([User.deleteMany(), Siswa.deleteMany(), Sholat.deleteMany()]);

  const parent1 = await User.create({
    name: 'Budi Santoso', email: 'budi@example.com', password: seedPassword, phone: '081234567890',
  });
  const parent2 = await User.create({
    name: 'Siti Aminah', email: 'siti@example.com', password: seedPassword, phone: '081298765432',
  });

  const siswa = await Siswa.insertMany([
    { idSiswa: 1, nama: 'Ahmad Fauzi', nis: '2024001', kelas: '5A', jenisKelamin: 'L', parent: parent1._id },
    { idSiswa: 2, nama: 'Aisyah Putri', nis: '2024002', kelas: '3B', jenisKelamin: 'P', parent: parent1._id },
    { idSiswa: 3, nama: 'Muhammad Rizki', nis: '2024003', kelas: '6A', jenisKelamin: 'L', parent: parent2._id },
  ]);

  const records = [];
  for (const s of siswa) {
    for (let i = 0; i < 7; i++) {
      records.push({
        siswa: s._id,
        tanggal: daysAgo(i),
        dilihatWalkes: i > 0,
        subuh: pick(), dhuhur: pick(), ashar: pick(), maghrib: pick(), isya: pick(),
        dhuha: pick(), tahajjud: Math.random() < 0.4, qobliyah: pick(), badiyah: pick(),
      });
    }
  }
  await Sholat.insertMany(records);

  console.log('Seed selesai.');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
