const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  const header = (req.get('authorization') || '').trim();
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET belum dikonfigurasi');
    return res.status(500).json({ success: false, message: 'Konfigurasi autentikasi server belum tersedia' });
  }

  let decoded;
  try {
    decoded = jwt.verify(match[1], secret);
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token kedaluwarsa' : 'Token tidak valid';
    return res.status(401).json({ success: false, message });
  }

  if (!decoded || typeof decoded !== 'object' || !decoded.id) {
    return res.status(401).json({ success: false, message: 'Token tidak valid' });
  }

  let user;
  try {
    user = await User.findById(decoded.id);
  } catch (err) {
    console.error('Gagal memeriksa user:', err.message);
    return res.status(503).json({ success: false, message: 'Database tidak tersedia' });
  }

  if (!user) {
    return res.status(401).json({ success: false, message: 'User tidak ditemukan' });
  }

  req.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
  return next();
};
