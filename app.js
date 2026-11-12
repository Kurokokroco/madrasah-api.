require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(async (req, res, next) => {
  try {
    await connectDB();
    return next();
  } catch (err) {
    console.error('Gagal konek MongoDB:', err.message);
    return res.status(503).json({
      success: false,
      message: 'Database tidak tersedia',
      data: null,
    });
  }
});

app.use((req, res, next) => {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET belum dikonfigurasi');
    return res.status(500).json({
      success: false,
      message: 'Konfigurasi autentikasi server belum tersedia',
      data: null,
    });
  }
  return next();
});

app.get('/', (req, res) => res.json({ app: 'Madrasah API', status: 'online' }));
app.use('/api/parent', require('./routes/parent'));

app.use((req, res) =>
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' })
);

module.exports = app;
