// Task API - Postgres-backed CRUD to-do API (FlyRank W1/A3, Express lane).
// Sequel to A2: same routes, same request/response shapes, only the storage
// layer moved from SQLite to a containerized Postgres.
const express = require("express");

const { pool, init, toTask } = require("./db");

const app = express();
const PORT = 3000;

app.use(express.json());

/**
 * Validation - the server never trusts the client. Unchanged from A1/A2.
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

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "ok" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "down" });
  }
});

// ---------------------------------------------------------------------------
// Read.
// ---------------------------------------------------------------------------

app.get("/tasks", async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM tasks ORDER BY id");
    res.json(rows.map(toTask));
  } catch (err) {
    next(err);
  }
});

app.get("/tasks/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const { rows } = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: `Task ${req.params.id} not found` });
    }

    res.json(toTask(rows[0]));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Create.
// ---------------------------------------------------------------------------

app.post("/tasks", async (req, res, next) => {
  try {
    const body = req.body ?? {};

    const titleError = validateTitle(body.title);
    if (titleError) return res.status(400).json({ error: titleError });

    const doneError = validateDone(body.done);
    if (doneError) return res.status(400).json({ error: doneError });

    const title = body.title.trim();
    const done = body.done ?? false;

    const { rows } = await pool.query(
      "INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *",
      [title, done]
    );

    res.status(201).json(toTask(rows[0]));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Update and Delete.
// ---------------------------------------------------------------------------

app.put("/tasks/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const { rows } = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: `Task ${req.params.id} not found` });
    }

    const row = rows[0];
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

    const { rows: updatedRows } = await pool.query(
      "UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *",
      [title, done, id]
    );

    res.json(toTask(updatedRows[0]));
  } catch (err) {
    next(err);
  }
});

app.delete("/tasks/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const result = await pool.query("DELETE FROM tasks WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: `Task ${req.params.id} not found` });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
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

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Task API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
