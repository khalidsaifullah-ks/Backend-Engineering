// AI-GENERATED CODE (rematch) - DO NOT MERGE INTO THE HAND-BUILT API.
// Produced from docs/ai-prompt.md (attempt 2, the sharpened prompt) by
// Kiro / Claude Opus 5 on 2026-09-03. Kept unedited.
const express = require("express");
const swaggerUi = require("swagger-ui-express");

const app = express();
const PORT = 4001;

app.use(express.json());

const seed = () => [
  { id: 1, title: "Learn Express", done: true },
  { id: 2, title: "Write the API", done: false },
  { id: 3, title: "Deploy it", done: false },
];

let tasks = seed();
let nextId = 4; // monotonic - never derived from length or max(id)

function validateTitle(title) {
  if (typeof title !== "string") return "'title' must be a string";
  if (title.trim() === "") return "'title' must not be empty";
  return null;
}

app.get("/tasks", (req, res) => res.json(tasks));

app.get("/tasks/:id", (req, res) => {
  const task = tasks.find((t) => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: `Task ${req.params.id} not found` });
  res.json(task);
});

app.post("/tasks", (req, res) => {
  const { title, done } = req.body || {};
  if (title === undefined) return res.status(400).json({ error: "'title' is required" });
  const titleError = validateTitle(title);
  if (titleError) return res.status(400).json({ error: titleError });
  if (done !== undefined && typeof done !== "boolean") {
    return res.status(400).json({ error: "'done' must be a boolean" });
  }
  const task = { id: nextId++, title: title.trim(), done: done ?? false };
  tasks.push(task);
  res.status(201).json(task);
});

app.put("/tasks/:id", (req, res) => {
  const task = tasks.find((t) => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: `Task ${req.params.id} not found` });

  const { title, done } = req.body || {};
  if (title === undefined && done === undefined) {
    return res.status(400).json({ error: "Body must contain 'title' and/or 'done'" });
  }
  if (title !== undefined) {
    const titleError = validateTitle(title);
    if (titleError) return res.status(400).json({ error: titleError });
    task.title = title.trim();
  }
  if (done !== undefined) {
    if (typeof done !== "boolean") {
      return res.status(400).json({ error: "'done' must be a boolean" });
    }
    task.done = done;
  }
  res.json(task);
});

app.delete("/tasks/:id", (req, res) => {
  const index = tasks.findIndex((t) => t.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: `Task ${req.params.id} not found` });
  tasks.splice(index, 1);
  res.status(204).send();
});

const swaggerDocument = {
  openapi: "3.0.0",
  info: { title: "Todo API (AI rematch)", version: "1.0.0" },
  paths: {
    "/tasks": {
      get: { summary: "List tasks", responses: { 200: { description: "OK" } } },
      post: {
        summary: "Create a task",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string", minLength: 1 },
                  done: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Created" }, 400: { description: "Bad Request" } },
      },
    },
    "/tasks/{id}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
      ],
      get: {
        summary: "Read one task",
        responses: { 200: { description: "OK" }, 404: { description: "Not Found" } },
      },
      put: {
        summary: "Partially update a task",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                minProperties: 1,
                properties: {
                  title: { type: "string", minLength: 1 },
                  done: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "OK" },
          400: { description: "Bad Request" },
          404: { description: "Not Found" },
        },
      },
      delete: {
        summary: "Delete a task",
        responses: { 204: { description: "No Content" }, 404: { description: "Not Found" } },
      },
    },
  },
};

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// JSON catch-all for unknown paths.
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// JSON error handler for unparseable bodies.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON body" });
  }
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => console.log(`AI rematch listening on ${PORT}`));
