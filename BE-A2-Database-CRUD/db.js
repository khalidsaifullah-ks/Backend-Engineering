// Storage layer - SQLite instead of an in-memory array. The API/routes in
// index.js do not change; only what's behind them does.
// Uses Node's built-in node:sqlite (no native module to compile/install).
const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync("tasks.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done  INTEGER NOT NULL DEFAULT 0
  )
`);

const countRow = db.prepare("SELECT COUNT(*) AS n FROM tasks").get();
if (countRow.n === 0) {
  // Seeding is all-or-nothing: either all three rows land or none do.
  db.exec("BEGIN");
  try {
    const seed = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");
    seed.run("Read MDN on HTTP", 1);
    seed.run("Build the CRUD API", 0);
    seed.run("Push it to GitHub", 0);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function toTask(row) {
  return { id: row.id, title: row.title, done: !!row.done };
}

module.exports = { db, toTask };
