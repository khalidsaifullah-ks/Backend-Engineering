// Storage layer - SQLite via the built-in node:sqlite module. FlyRank W4/A8.
const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync("report.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    customer   TEXT NOT NULL,
    product    TEXT NOT NULL,
    amount     REAL NOT NULL,
    created_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    path       TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

module.exports = { db };
