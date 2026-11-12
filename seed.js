require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Siswa = require('./models/Siswa');
const Sholat = require('./models/Sholat');
const Tahfidz = require('./models/Tahfidz');
const { daysAgo } = require('./utils/date');

const seedPassword = process.env.SEED_PARENT_PASSWORD;

if (!process.env.MONGODB_URI || !seedPassword) {
  console.error('MONGODB_URI dan SEED_PARENT_PASSWORD wajib diisi');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  console.error('Seed dummy ditolak di production. Set ALLOW_DEMO_SEED=true hanya jika memang disengaja.');
  process.exit(1);
}

const parentSamples = [
  {
    name: 'Budi Santoso',
    email: 'budi@example.com',
    phone: '081234567890',
    students: [
      { nama: 'Ahmad Fauzi', nis: 'DEMO-2024001', kelas: '5A', jenisKelamin: 'L' },
      { nama: 'Aisyah Putri', nis: 'DEMO-2024002', kelas: '3B', jenisKelamin: 'P' },
    ],
  },
  {
    name: 'Siti Aminah',
    email: 'siti@example.com',
    phone: '081298765432',
    students: [
      { nama: 'Muhammad Rizki', nis: 'DEMO-2024003', kelas: '6A', jenisKelamin: 'L' },
    ],
  },
];

const sholatSamples = [
  { subuh: true, dhuhur: true, ashar: true, maghrib: true, isya: true },
  { subuh: true, dhuhur: true, ashar: false, maghrib: true, isya: true },
  { subuh: false, dhuhur: true, ashar: true, maghrib: true, isya: false },
];

const tahfidzSamples = [
  {
    daysAgo: 0,
    juz: '30',
    surah: 'An-Naba',
    ayat: '1-10',
    guru: 'Guru Contoh',
    ttd: '',
    keterangan: 'Lancar',
  },
  {
    daysAgo: 2,
    juz: '30',
    surah: 'An-Naziat',
    ayat: '1-10',
    guru: 'Guru Contoh',
    ttd: '',
    keterangan: 'Perlu pengulangan',
  },
];

const ensureParent = async (sample) => {
  let parent = await User.findOne({ email: sample.email });
  if (!parent) {
    parent = await User.create({
      name: sample.name,
      email: sample.email,
      password: seedPassword,
      phone: sample.phone,
    });
  }
  return parent;
};

const ensureStudent = async (sample, parent, nextStudentId) => {
  let student = await Siswa.findOne({ nis: sample.nis });
  if (student) {
    if (student.parent.toString() !== parent._id.toString()) {
      throw new Error(`NIS ${sample.nis} sudah terhubung ke akun lain; data tidak diubah`);
    }
    return { student, nextStudentId };
  }

  const idSiswa = nextStudentId + 1;
  student = await Siswa.create({
    idSiswa,
    ...sample,
    parent: parent._id,
  });
  return { student, nextStudentId: idSiswa };
};

const seedDemoData = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const highestStudent = await Siswa.findOne()
    .sort({ idSiswa: -1 })
    .select('idSiswa')
    .lean();
  let nextStudentId = highestStudent?.idSiswa || 0;
  let studentsCreated = 0;
  let sholatCreated = 0;
  let tahfidzCreated = 0;

  for (const parentSample of parentSamples) {
    const parent = await ensureParent(parentSample);

    for (const studentSample of parentSample.students) {
      const existed = await Siswa.exists({ nis: studentSample.nis });
      const result = await ensureStudent(studentSample, parent, nextStudentId);
      const student = result.student;
      nextStudentId = result.nextStudentId;
      if (!existed) studentsCreated += 1;

      for (let day = 0; day < 7; day += 1) {
        const tanggal = daysAgo(day);
        const prayerValues = sholatSamples[day % sholatSamples.length];
        const result = await Sholat.updateOne(
          { siswa: student._id, tanggal },
          {
            $setOnInsert: {
              siswa: student._id,
              tanggal,
              ...prayerValues,
              dilihatWalkes: day > 0,
              dhuha: day % 2 === 0,
              tahajjud: day % 3 === 0,
              qobliyah: true,
              badiyah: true,
            },
          },
          { upsert: true }
        );
        if (result.upsertedCount) sholatCreated += 1;
      }

      for (const sample of tahfidzSamples) {
        const tanggal = daysAgo(sample.daysAgo);
        const exists = await Tahfidz.exists({
          siswa: student._id,
          tanggal,
          surah: sample.surah,
          ayat: sample.ayat,
        });
        if (exists) continue;

        await Tahfidz.create({
          siswa: student._id,
          tanggal,
          juz: sample.juz,
          surah: sample.surah,
          ayat: sample.ayat,
          guru: sample.guru,
          ttd: sample.ttd,
          keterangan: sample.keterangan,
        });
        tahfidzCreated += 1;
      }
    }
  }

  console.log(
    `Seed selesai. Siswa baru: ${studentsCreated}, sholat baru: ${sholatCreated}, tahfidz baru: ${tahfidzCreated}.`
  );
};

seedDemoData()
  .catch((err) => {
    console.error('Gagal menjalankan seed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
