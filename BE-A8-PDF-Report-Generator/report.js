// Aggregation queries - turns 200 order rows into a handful of numbers.
// FlyRank W4/A8, Stage 2.
const { db } = require("./db");

function getReportData() {
  const { totalOrders } = db.prepare("SELECT COUNT(*) AS totalOrders FROM orders").get();

  const { totalRevenue } = db.prepare("SELECT SUM(amount) AS totalRevenue FROM orders").get();

  const topProducts = db
    .prepare(
      `SELECT product, SUM(amount) AS revenue
       FROM orders
       GROUP BY product
       ORDER BY revenue DESC
       LIMIT 5`
    )
    .all();

  const ordersPerDay = db
    .prepare(
      `SELECT date(created_at) AS day, COUNT(*) AS count
       FROM orders
       WHERE date(created_at) >= date('now', '-7 days')
       GROUP BY day
       ORDER BY day`
    )
    .all();

  const allOrders = db
    .prepare("SELECT id, customer, product, amount, created_at FROM orders ORDER BY created_at DESC")
    .all();

  return {
    totalOrders,
    totalRevenue: Math.round((totalRevenue ?? 0) * 100) / 100,
    topProducts,
    ordersPerDay,
    allOrders,
  };
}

module.exports = { getReportData };
