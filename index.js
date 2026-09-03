// Task API - an in-memory CRUD to-do API (FlyRank W2/A1, Express lane).
const express = require("express");

const app = express();
const PORT = 3000;

// ---------------------------------------------------------------------------
// Stage 2 - the "database": a plain JavaScript array.
// In-memory means fast and simple, and gone the moment this process stops.
// ---------------------------------------------------------------------------
const SEED_TASKS = [
  { id: 1, title: "Read MDN on HTTP", done: true },
  { id: 2, title: "Build the CRUD API", done: false },
  { id: 3, title: "Push it to GitHub", done: false },
];

let tasks = SEED_TASKS.map((task) => ({ ...task }));

// Ids never get reused, even after a delete - a deleted id stays dead.
let nextId = 4;

/** Finds a task by its id, or returns undefined. */
function findTask(id) {
  return tasks.find((task) => task.id === id);
}

/** Turns a path parameter into a number, or NaN if it is not one. */
function parseId(raw) {
  return /^\d+$/.test(raw) ? Number(raw) : NaN;
}

// ---------------------------------------------------------------------------
// Stage 1 - the front door and the health probe.
// ---------------------------------------------------------------------------

// A machine-readable description of this API.
app.get("/", (req, res) => {
  res.json({
    name: "Task API",
    version: "1.0",
    endpoints: ["/tasks"],
  });
});

// Liveness probe. Real deployments poll exactly this.
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ---------------------------------------------------------------------------
// Stage 2 - Read.
// ---------------------------------------------------------------------------

// List every task.
app.get("/tasks", (req, res) => {
  res.json(tasks);
});

// Read one task. `:id` is a path parameter - the changing piece of the URL.
app.get("/tasks/:id", (req, res) => {
  const id = parseId(req.params.id);
  const task = findTask(id);

  // Never answer 200 with an empty body for something that does not exist.
  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  res.json(task);
});

app.listen(PORT, () => {
  console.log(`Task API listening on http://localhost:${PORT}`);
});
