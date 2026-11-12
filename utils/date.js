// Mengembalikan tanggal format YYYY-MM-DD dalam zona waktu WIB
const toWIB = (date = new Date()) =>
  date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toWIB(d);
};

module.exports = { toWIB, daysAgo };
