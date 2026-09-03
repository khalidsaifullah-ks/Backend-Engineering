// Task API - SQLite-backed CRUD to-do API (FlyRank W3/A2, Express lane).
// Sequel to A1: same routes, same request/response shapes, only the storage
// layer moved from memory to tasks.db.
const express = require("express");
const swaggerUi = require("swagger-ui-express");

const openapiSpec = require("./openapi.json");
const { db, toTask } = require("./db");

const app = express();
const PORT = 3000;

app.use(express.json());

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, { customSiteTitle: "Task API docs" })
);

app.get("/openapi.json", (req, res) => {
  res.json(openapiSpec);
});

/**
 * Validation - the server never trusts the client. Unchanged from A1.
 */
function validateTitle(title) {
  if (title === undefined || title === null) return "Field 'title' is required";
  if (typeof title !== "string") return "Field 'title' must be a string";
  if (title.trim() === "") return "Field 'title' must not be empty";
  return null;
}

function validateDone(done) {
  if (done !== undefined && typeof done !== "boolean") {
    return "Field 'done' must be a boolean";
  }
  return null;
}

/** Turns a path parameter into a number, or NaN if it is not one. */
function parseId(raw) {
  return /^\d+$/.test(raw) ? Number(raw) : NaN;
}

// ---------------------------------------------------------------------------
// Meta.
// ---------------------------------------------------------------------------

app.get("/", (req, res) => {
  res.json({ name: "Task API", version: "1.0", endpoints: ["/tasks"] });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/stats", (req, res) => {
  const row = db
    .prepare(
      "SELECT COUNT(*) AS total, SUM(done) AS done FROM tasks"
    )
    .get();
  const done = row.done ?? 0;
  res.json({ total: row.total, done, open: row.total - done });
});

// ---------------------------------------------------------------------------
// Read.
// ---------------------------------------------------------------------------

app.get("/tasks", (req, res) => {
  const { done, search, limit, offset } = req.query;

  let sql = "SELECT * FROM tasks WHERE 1 = 1";
  const params = [];

  if (done !== undefined) {
    if (done !== "true" && done !== "false") {
      return res
        .status(400)
        .json({ error: "Query 'done' must be 'true' or 'false'" });
    }
    sql += " AND done = ?";
    params.push(done === "true" ? 1 : 0);
  }

  if (search !== undefined) {
    sql += " AND title LIKE ? COLLATE NOCASE";
    params.push(`%${search}%`);
  }

  sql += " ORDER BY id";

  if (limit !== undefined) {
    if (!/^\d+$/.test(limit) || Number(limit) === 0) {
      return res
        .status(400)
        .json({ error: "Query 'limit' must be a positive integer" });
    }
    sql += " LIMIT ?";
    params.push(Number(limit));

    if (offset !== undefined) {
      if (!/^\d+$/.test(offset)) {
        return res
          .status(400)
          .json({ error: "Query 'offset' must be a non-negative integer" });
      }
      sql += " OFFSET ?";
      params.push(Number(offset));
    }
  } else if (offset !== undefined) {
    if (!/^\d+$/.test(offset)) {
      return res
        .status(400)
        .json({ error: "Query 'offset' must be a non-negative integer" });
    }
    sql += " LIMIT -1 OFFSET ?";
    params.push(Number(offset));
  }

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(toTask));
});

app.get("/tasks/:id", (req, res) => {
  const id = parseId(req.params.id);
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

  if (!row) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  res.json(toTask(row));
});

// ---------------------------------------------------------------------------
// Create.
// ---------------------------------------------------------------------------

app.post("/tasks", (req, res) => {
  const body = req.body ?? {};

  const titleError = validateTitle(body.title);
  if (titleError) return res.status(400).json({ error: titleError });

  const doneError = validateDone(body.done);
  if (doneError) return res.status(400).json({ error: doneError });

  const title = body.title.trim();
  const done = body.done ?? false;

  const result = db
    .prepare("INSERT INTO tasks (title, done) VALUES (?, ?)")
    .run(title, done ? 1 : 0);

  res.status(201).json({ id: result.lastInsertRowid, title, done });
});

// ---------------------------------------------------------------------------
// Update and Delete.
// ---------------------------------------------------------------------------

app.put("/tasks/:id", (req, res) => {
  const id = parseId(req.params.id);
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

  if (!row) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  const body = req.body ?? {};

  if (body.title === undefined && body.done === undefined) {
    return res
      .status(400)
      .json({ error: "Body must contain 'title' and/or 'done'" });
  }

  if (body.title !== undefined) {
    const titleError = validateTitle(body.title);
    if (titleError) return res.status(400).json({ error: titleError });
  }

  const doneError = validateDone(body.done);
  if (doneError) return res.status(400).json({ error: doneError });

  const title = body.title !== undefined ? body.title.trim() : row.title;
  const done = body.done !== undefined ? body.done : !!row.done;

  db.prepare("UPDATE tasks SET title = ?, done = ? WHERE id = ?").run(
    title,
    done ? 1 : 0,
    id
  );

  res.json({ id, title, done });
});

app.delete("/tasks/:id", (req, res) => {
  const id = parseId(req.params.id);
  const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  res.status(204).send();
});

// Restores the three seed tasks, wiping everything else - handy for demos.
app.post("/reset", (req, res) => {
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM tasks");
    db.exec("DELETE FROM sqlite_sequence WHERE name='tasks'");
    const seed = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");
    seed.run("Read MDN on HTTP", 1);
    seed.run("Build the CRUD API", 0);
    seed.run("Push it to GitHub", 0);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  res.json(db.prepare("SELECT * FROM tasks ORDER BY id").all().map(toTask));
});

// ---------------------------------------------------------------------------
// Fallbacks - an API should answer JSON even when things go wrong.
// ---------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({ error: `No endpoint for ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Task API listening on http://localhost:${PORT}`);
});
