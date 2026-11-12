require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error('MONGODB_URI dan JWT_SECRET wajib diisi di environment variable');
  process.exit(1);
}

const app = express();

app.use(cors()); // izinkan semua origin (aplikasi Android tidak terkena CORS, tapi aman untuk web/testing)
app.use(express.json());

app.get('/', (req, res) => res.json({ app: 'Madrasah API', status: 'online' }));
app.use('/api/parent', require('./routes/parent'));

app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' }));

const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
});
