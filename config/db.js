const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB terhubung:', mongoose.connection.host);
  } catch (err) {
    console.error('Gagal konek MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
