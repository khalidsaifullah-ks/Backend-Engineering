// Task API - an in-memory CRUD to-do API (FlyRank W2/A1, Express lane).
const express = require("express");
const swaggerUi = require("swagger-ui-express");

const openapiSpec = require("./openapi.json");

const app = express();
const PORT = 3000;

// Parse JSON request bodies. Without this, req.body is undefined.
app.use(express.json());

// ---------------------------------------------------------------------------
// Stage 5 - Swagger UI. openapi.json describes the API; this page renders it
// as interactive docs with a "Try it out" button on every endpoint.
// ---------------------------------------------------------------------------
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: "Task API docs",
  })
);

// The raw spec, for tools that want to read it instead of look at it.
app.get("/openapi.json", (req, res) => {
  res.json(openapiSpec);
});

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

/**
 * Stage 3 - validation. The server never trusts the client.
 * Returns an error string, or null when the title is acceptable.
 */
function validateTitle(title) {
  if (title === undefined || title === null) {
    return "Field 'title' is required";
  }
  if (typeof title !== "string") {
    return "Field 'title' must be a string";
  }
  if (title.trim() === "") {
    return "Field 'title' must not be empty";
  }
  return null;
}

/** Validates the optional `done` flag. Returns an error string or null. */
function validateDone(done) {
  if (done !== undefined && typeof done !== "boolean") {
    return "Field 'done' must be a boolean";
  }
  return null;
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

// ---------------------------------------------------------------------------
// Stage 3 - Create.
// ---------------------------------------------------------------------------

app.post("/tasks", (req, res) => {
  const body = req.body ?? {};

  const titleError = validateTitle(body.title);
  if (titleError) {
    return res.status(400).json({ error: titleError });
  }

  const doneError = validateDone(body.done);
  if (doneError) {
    return res.status(400).json({ error: doneError });
  }

  const task = {
    id: nextId++,
    title: body.title.trim(),
    done: body.done ?? false,
  };

  tasks.push(task);

  // 201 Created - "done, and here is your receipt".
  res.status(201).json(task);
});

// ---------------------------------------------------------------------------
// Stage 4 - Update and Delete.
// ---------------------------------------------------------------------------

app.put("/tasks/:id", (req, res) => {
  const id = parseId(req.params.id);
  const task = findTask(id);

  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  const body = req.body ?? {};

  // An empty body is meaningless for an update - say so instead of guessing.
  if (body.title === undefined && body.done === undefined) {
    return res
      .status(400)
      .json({ error: "Body must contain 'title' and/or 'done'" });
  }

  if (body.title !== undefined) {
    const titleError = validateTitle(body.title);
    if (titleError) {
      return res.status(400).json({ error: titleError });
    }
  }

  const doneError = validateDone(body.done);
  if (doneError) {
    return res.status(400).json({ error: doneError });
  }

  if (body.title !== undefined) task.title = body.title.trim();
  if (body.done !== undefined) task.done = body.done;

  res.json(task);
});

app.delete("/tasks/:id", (req, res) => {
  const id = parseId(req.params.id);
  const index = tasks.findIndex((task) => task.id === id);

  if (index === -1) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  tasks.splice(index, 1);

  // 204 No Content - it worked, and there is nothing left to say.
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Fallbacks - an API should answer JSON even when things go wrong.
// ---------------------------------------------------------------------------

// Unknown path -> 404 JSON instead of Express' default HTML page.
app.use((req, res) => {
  res.status(404).json({ error: `No endpoint for ${req.method} ${req.path}` });
});

// Body that is not valid JSON -> 400 JSON instead of an HTML stack trace.
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
