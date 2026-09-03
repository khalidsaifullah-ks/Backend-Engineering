// Seeds report.db with ~200 random shop orders. Safe to run twice: it wipes
// the table first, so the row count never doubles. FlyRank W4/A8, Stage 1.
const { db } = require("./db");

const CUSTOMERS = [
  "Ava Chen", "Liam Torres", "Noor Rahman", "Sofia Rossi", "Kenji Sato",
  "Maya Patel", "Diego Alvarez", "Freya Larsen", "Omar Haddad", "Lucia Fontaine",
];
const PRODUCTS = ["Notebook", "Desk Lamp", "Backpack", "Water Bottle", "Headphones", "Mug"];

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomAmount() {
  return Math.round((Math.random() * (200 - 5) + 5) * 100) / 100;
}

function randomRecentDate() {
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function seed(count = 200) {
  // Start clean - running this twice must not double the row count.
  db.exec("DELETE FROM orders");
  db.exec("DELETE FROM sqlite_sequence WHERE name = 'orders'");

  const insert = db.prepare(
    "INSERT INTO orders (customer, product, amount, created_at) VALUES (?, ?, ?, ?)"
  );

  for (let i = 0; i < count; i++) {
    insert.run(randomFrom(CUSTOMERS), randomFrom(PRODUCTS), randomAmount(), randomRecentDate());
  }

  const { count: total } = db.prepare("SELECT COUNT(*) AS count FROM orders").get();
  console.log(`Seeded ${total} orders.`);
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
