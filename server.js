require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error('MONGODB_URI dan JWT_SECRET wajib diisi');
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
  })
  .catch((err) => {
    console.error('Gagal memulai server:', err.message);
    process.exitCode = 1;
  });
