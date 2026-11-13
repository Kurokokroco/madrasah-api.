const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Siswa = require('../models/Siswa');
const Sholat = require('../models/Sholat');
const BirrulWalidain = require('../models/BirrulWalidain');
const Tahfidz = require('../models/Tahfidz');
const QuranReading = require('../models/QuranReading');
const Btq = require('../models/Btq');
const CatatanWalkes = require('../models/CatatanWalkes');
const Counter = require('../models/Counter');
const auth = require('../middleware/auth');
const { toWIB, daysAgo } = require('../utils/date');

const router = express.Router();

const WAJIB = ['subuh', 'dhuhur', 'ashar', 'maghrib', 'isya'];
const FIELDS = [...WAJIB, 'dhuha', 'tahajjud', 'qobliyah', 'badiyah'];
const ALIAS = { dzuhur: 'dhuhur', tahajud: 'tahajjud' };

const toBool = (v) => v === true || v === 1 || v === '1' || v === 'true';

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server', data: null });
  });

// Ambil siswa dari header/query id_siswa (angka). Kalau kosong atau 0 -> anak pertama.
const resolveSiswa = async (req) => {
  const n = parseInt(req.headers['id_siswa'] || req.query.id_siswa, 10);
  if (n > 0) return Siswa.findOne({ idSiswa: n, parent: req.user.id });
  return Siswa.findOne({ parent: req.user.id }).sort('idSiswa');
};

const notFoundSiswa = (res) =>
  res.status(404).json({ success: false, message: 'Siswa tidak ditemukan', data: null });

const formatSiswa = (s) => ({
  id: s.idSiswa,
  id_siswa: s.idSiswa,
  name: s.nama,
  nama: s.nama,
  nis: s.nis,
  kelas: s.kelas,
  jenis_kelamin: s.jenisKelamin,
  foto: s.foto,
  photo: s.foto,
  profile_photo: s.foto,
  status: 'Aktif',
});

const formatSholat = (rec, tanggal) => {
  const out = {
    id: Number(tanggal.replace(/-/g, '')), // contoh: 20261112
    tanggal,
    dilihat_walkes: !!rec?.dilihatWalkes,
  };
  FIELDS.forEach((f) => {
    out[f] = !!rec?.[f];
  });
  return out;
};

const nextBirrulWalidainId = async () => {
  const counter = await Counter.findByIdAndUpdate(
    'birrul-walidain',
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter.seq;
};

const formatBirrulWalidain = (record, siswaId) => ({
  id: record.id,
  siswa_id: siswaId,
  tanggal: record.tanggal,
  tempat: record.tempat,
  kegiatan: record.kegiatan,
  hafalan_surah: record.hafalanSurah,
  baca_buku: record.bacaBuku,
  lain_lain: record.lainLain,
  status_approval: record.statusApproval,
});

// POST /api/parent/login
router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Email atau password salah' });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  const userData = {
    id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role,
  };

  res.json({
    success: true,
    message: 'Login berhasil',
    token,
    user: userData,
    data: { token, user: userData },
  });
}));

// GET /api/parent/siswa
router.get('/siswa', auth, wrap(async (req, res) => {
  const list = await Siswa.find({ parent: req.user.id }).sort('idSiswa');
  res.json({ success: true, message: 'OK', data: list.map(formatSiswa) });
}));

// GET /api/parent/catatan-walkes (header/query: id_siswa)
router.get('/catatan-walkes', auth, wrap(async (req, res) => {
  const siswa = await resolveSiswa(req);
  if (!siswa) return notFoundSiswa(res);

  const records = await CatatanWalkes.find({ id_siswa: siswa.idSiswa })
    .sort({ tanggal: -1, id: -1 })
    .select('id tanggal mapel catatan')
    .lean();

  res.json({
    success: true,
    message: 'OK',
    data: records.map((record) => ({
      id: record.id,
      tanggal: record.tanggal,
      mapel: record.mapel,
      catatan: record.catatan,
    })),
  });
}));

// GET /api/parent/dashboard   (header: id_siswa)
router.get('/dashboard', auth, wrap(async (req, res) => {
  const siswa = await resolveSiswa(req);
  if (!siswa) return notFoundSiswa(res);

  const today = toWIB();
  const recs = await Sholat.find({
    siswa: siswa._id,
    tanggal: { $gte: daysAgo(6), $lte: today },
  });

  const total = recs.length * WAJIB.length;
  const hadir = recs.reduce((sum, r) => sum + WAJIB.filter((w) => r[w]).length, 0);
  const persen = total ? Math.round((hadir / total) * 100) : 0;

  res.json({
    success: true,
    message: 'OK',
    data: {
      identitas: { id: siswa.idSiswa, name: siswa.nama, nis: siswa.nis, status: 'Aktif' },
      ringkasan: { kehadiran: `${persen}%`, pelanggaran: 0 },
    },
  });
}));

// GET /api/parent/sholat? id_siswa=...
router.get('/sholat', auth, wrap(async (req, res) => {
  const siswa = await resolveSiswa(req);
  if (!siswa) return notFoundSiswa(res);

  const records = await Sholat.find({ siswa: siswa._id }).sort({ tanggal: -1 });
  res.json({
    success: true,
    message: 'OK',
    data: records.map((record) => formatSholat(record, record.tanggal)),
  });
}));

// GET /api/parent/sholat/hari-ini   (header: id_siswa)
router.get('/sholat/hari-ini', auth, wrap(async (req, res) => {
  const siswa = await resolveSiswa(req);
  if (!siswa) return notFoundSiswa(res);

  const today = toWIB();
  const rec = await Sholat.findOne({ siswa: siswa._id, tanggal: today });
  res.json({ success: true, message: 'OK', data: formatSholat(rec, today) });
}));

// GET /api/parent/birul-walidain (header: id_siswa)
router.get('/birul-walidain', auth, wrap(async (req, res) => {
  const siswa = await resolveSiswa(req);
  if (!siswa) return notFoundSiswa(res);

  const records = await BirrulWalidain.find({ siswa: siswa._id })
    .sort({ tanggal: -1, createdAt: -1 });

  res.json({
    success: true,
    message: 'OK',
    data: records.map((record) => formatBirrulWalidain(record, siswa.idSiswa)),
  });
}));

// POST /api/parent/birul-walidain (header: id_siswa)
router.post('/birul-walidain', auth, wrap(async (req, res) => {
  const siswa = await resolveSiswa(req);
  if (!siswa) return notFoundSiswa(res);

  const kegiatan = String(req.body?.kegiatan || '').trim();
  if (!kegiatan) {
    return res.status(400).json({
      success: false,
      message: 'Kegiatan wajib diisi',
      data: null,
    });
  }

  const record = await BirrulWalidain.create({
    id: await nextBirrulWalidainId(),
    siswa: siswa._id,
    tanggal: toWIB(),
    tempat: req.body?.tempat || '',
    kegiatan,
    hafalanSurah: req.body?.hafalan_surah || '',
    bacaBuku: req.body?.baca_buku || '',
    lainLain: req.body?.lain_lain || '',
    catatan: req.body?.catatan || '',
  });

  res.status(201).json({
    success: true,
    message: 'Data Birrul Walidain berhasil disimpan',
    data: formatBirrulWalidain(record, siswa.idSiswa),
  });
}));

// GET /api/parent/quran-reading (header: id_siswa)
router.get('/quran-reading', auth, wrap(async (req, res) => {
  const siswa = await resolveSiswa(req);
  if (!siswa) return notFoundSiswa(res);

  const records = await QuranReading.find({ siswa: siswa._id })
    .populate('siswa', 'nama')
    .sort({ tanggal: -1, createdAt: -1 });

  res.json({
    success: true,
    message: 'Berhasil',
    data: records.map((record) => ({
      siswa: record.siswa?.nama || '',
      ustad: record.ustad,
      tanggal: record.tanggal,
      juz: record.juz,
      surah: record.surah,
      ayat: record.ayat,
      halaman: record.halaman,
      keterangan: record.keterangan,
      ttd: record.ttd,
    })),
  });
}));

// GET /api/parent/tahfidz (header: id_siswa)
router.get('/tahfidz', auth, wrap(async (req, res) => {
  const siswa = await resolveSiswa(req);
  if (!siswa) return notFoundSiswa(res);

  const records = await Tahfidz.find({ siswa: siswa._id })
    .populate('siswa', 'nama')
    .sort({ tanggal: -1, createdAt: -1 });

  res.json({
    success: true,
    message: 'Berhasil',
    data: records.map((record) => ({
      siswa: record.siswa?.nama || '',
      tanggal: record.tanggal,
      juz: record.juz,
      surah: record.surah,
      ayat: record.ayat,
      guru: record.guru,
      ttd: record.ttd,
      keterangan: record.keterangan,
    })),
  });
}));

// GET /api/parent/btq (header: id_siswa, query: kelas_id)
router.get('/btq', auth, wrap(async (req, res) => {
  const siswa = await resolveSiswa(req);
  if (!siswa) {
    return res.status(404).json({ status: 'error', data: null });
  }

  const requestedClassId = req.query.kelas_id;
  const kelasId = requestedClassId === undefined ? null : Number(requestedClassId);
  if (requestedClassId !== undefined && (!Number.isSafeInteger(kelasId) || kelasId <= 0)) {
    return res.status(400).json({ status: 'error', data: null });
  }

  const classes = await Btq.find({ siswa: siswa._id })
    .sort({ sedangAktif: -1, idKelas: 1 })
    .lean();
  const currentClass = kelasId === null
    ? classes.find((item) => item.sedangAktif) || classes[0]
    : classes.find((item) => item.idKelas === kelasId);

  if (kelasId !== null && !currentClass) {
    return res.status(404).json({ status: 'error', data: null });
  }

  res.json({
    status: 'success',
    data: {
      kelas_tersedia: classes.map((item) => ({
        id_kelas: item.idKelas,
        nama_kelas: item.namaKelas,
        tahun_ajaran: item.tahunAjaran,
        sedang_aktif: item.sedangAktif,
      })),
      id_kelas_saat_ini: currentClass?.idKelas || 0,
      materi: (currentClass?.materi || []).map((item) => ({
        id: item.id,
        judul: item.judul,
        tipe_materi: item.tipeMateri,
        deskripsi: item.deskripsi,
        semester: item.semester,
        sudah_dinilai: !!item.penilaian,
        penilaian: item.penilaian
          ? {
              id: item.penilaian.id,
              nilai: item.penilaian.nilai,
              tanggal: item.penilaian.tanggal,
              disetujui: item.penilaian.disetujui,
              catatan: item.penilaian.catatan,
              nama_guru: item.penilaian.namaGuru,
            }
          : null,
      })),
    },
  });
}));

// POST /api/parent/sholat  (buat/ubah data sholat hari ini; juga menangani ?_method=PUT)
router.post('/sholat', auth, wrap(async (req, res) => {
  const siswa = await resolveSiswa(req);
  if (!siswa) return notFoundSiswa(res);

  const today = toWIB();
  const update = {};
  for (const [k, v] of Object.entries(req.body || {})) {
    const key = ALIAS[k] || k;
    if (FIELDS.includes(key)) update[key] = toBool(v);
  }

  let rec = await Sholat.findOne({ siswa: siswa._id, tanggal: today });
  if (!rec) rec = new Sholat({ siswa: siswa._id, tanggal: today });
  rec.set(update);
  await rec.save();

  res.json({ success: true, message: 'Data sholat disimpan', data: formatSholat(rec, today) });
}));

module.exports = router;
