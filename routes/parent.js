const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Siswa = require('../models/Siswa');
const Sholat = require('../models/Sholat');
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

// GET /api/parent/sholat/hari-ini   (header: id_siswa)
router.get('/sholat/hari-ini', auth, wrap(async (req, res) => {
  const siswa = await resolveSiswa(req);
  if (!siswa) return notFoundSiswa(res);

  const today = toWIB();
  const rec = await Sholat.findOne({ siswa: siswa._id, tanggal: today });
  res.json({ success: true, message: 'OK', data: formatSholat(rec, today) });
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
