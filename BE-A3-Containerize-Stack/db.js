// Storage layer - Postgres instead of SQLite. The API/routes in index.js do
// not change; only what's behind them does. Every DB line lives here.
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id    SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done  BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);

  const { rows } = await pool.query("SELECT COUNT(*) AS n FROM tasks");
  if (Number(rows[0].n) === 0) {
    await pool.query(
      `INSERT INTO tasks (title, done) VALUES
        ('Read MDN on HTTP', true),
        ('Build the CRUD API', false),
        ('Push it to GitHub', false)`
    );
  }
}

function toTask(row) {
  return { id: row.id, title: row.title, done: !!row.done };
}

module.exports = { pool, init, toTask };
