// Builds the report HTML and prints it to a PDF with Playwright.
// FlyRank W4/A8, Stage 3.
const { chromium } = require("playwright");

function formatCurrency(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildReportHtml(data) {
  const today = new Date().toLocaleDateString("en-US", { dateStyle: "long" });

  const topProductsRows = data.topProducts
    .map(
      (p) => `<tr><td>${p.product}</td><td>${formatCurrency(p.revenue)}</td></tr>`
    )
    .join("");

  const ordersPerDayRows = data.ordersPerDay
    .map((d) => `<tr><td>${d.day}</td><td>${d.count}</td></tr>`)
    .join("");

  const allOrdersRows = data.allOrders
    .map(
      (o) =>
        `<tr><td>${o.id}</td><td>${o.customer}</td><td>${o.product}</td><td>${formatCurrency(
          o.amount
        )}</td><td>${formatDate(o.created_at)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; margin: 24px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #555; margin-bottom: 24px; }
  .totals { display: flex; gap: 32px; margin-bottom: 24px; }
  .totals div { border: 1px solid #ddd; border-radius: 8px; padding: 12px 20px; }
  .totals .label { font-size: 12px; color: #777; text-transform: uppercase; }
  .totals .value { font-size: 20px; font-weight: bold; }
  h2 { font-size: 16px; margin-top: 32px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead { display: table-header-group; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 12px; }
  th { background: #f5f5f5; }
  tr { break-inside: avoid; }
</style>
</head>
<body>
  <h1>Sales Report</h1>
  <div class="subtitle">Generated ${today}</div>

  <div class="totals">
    <div>
      <div class="label">Total Orders</div>
      <div class="value">${data.totalOrders}</div>
    </div>
    <div>
      <div class="label">Total Revenue</div>
      <div class="value">${formatCurrency(data.totalRevenue)}</div>
    </div>
  </div>

  <h2>Top 5 products by revenue</h2>
  <table>
    <thead><tr><th>Product</th><th>Revenue</th></tr></thead>
    <tbody>${topProductsRows}</tbody>
  </table>

  <h2>Orders per day (last 7 days)</h2>
  <table>
    <thead><tr><th>Day</th><th>Orders</th></tr></thead>
    <tbody>${ordersPerDayRows}</tbody>
  </table>

  <h2>All orders</h2>
  <table>
    <thead><tr><th>ID</th><th>Customer</th><th>Product</th><th>Amount</th><th>Created</th></tr></thead>
    <tbody>${allOrdersRows}</tbody>
  </table>
</body>
</html>`;
}

async function renderReportPdf(data, outputPath) {
  const html = buildReportHtml(data);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({ path: outputPath, format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }
}

module.exports = { buildReportHtml, renderReportPdf };
