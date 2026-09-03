// AI-GENERATED CODE - DO NOT MERGE INTO THE HAND-BUILT API.
// Produced in one shot from docs/ai-prompt.md (attempt 1) by Kiro / Claude
// Opus 5 on 2026-09-03. Kept here unedited so the diff and the review in the
// README stay honest.
const express = require("express");
const swaggerUi = require("swagger-ui-express");

const app = express();
const PORT = 4000;

app.use(express.json());

let tasks = [
  { id: 1, title: "Learn Express", done: true },
  { id: 2, title: "Write the API", done: false },
  { id: 3, title: "Deploy it", done: false },
];

// GET /tasks - list all tasks
app.get("/tasks", (req, res) => {
  res.status(200).json(tasks);
});

// GET /tasks/:id - get a single task
app.get("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    return res.status(404).json({ error: `Task with id ${id} not found` });
  }
  res.status(200).json(task);
});

// POST /tasks - create a task
app.post("/tasks", (req, res) => {
  const { title } = req.body;
  if (!title || title.length === 0) {
    return res.status(400).json({ error: "Title is required and cannot be empty" });
  }
  const newTask = {
    id: tasks.length + 1,
    title: title,
    done: false,
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

// PUT /tasks/:id - update a task
app.put("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    return res.status(404).json({ error: `Task with id ${id} not found` });
  }
  const { title, done } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  task.title = title;
  task.done = done !== undefined ? done : task.done;
  res.status(200).json(task);
});

// DELETE /tasks/:id - delete a task
app.delete("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `Task with id ${id} not found` });
  }
  tasks.splice(index, 1);
  res.status(204).send();
});

// Swagger UI
const swaggerDocument = {
  openapi: "3.0.0",
  info: { title: "Todo API", version: "1.0.0" },
  paths: {
    "/tasks": {
      get: {
        summary: "Get all tasks",
        responses: { 200: { description: "List of tasks" } },
      },
      post: {
        summary: "Create a task",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { title: { type: "string" } },
                required: ["title"],
              },
            },
          },
        },
        responses: {
          201: { description: "Task created" },
          400: { description: "Invalid input" },
        },
      },
    },
    "/tasks/{id}": {
      get: {
        summary: "Get a task by id",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "The task" },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: "Update a task",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  done: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated task" },
          400: { description: "Invalid input" },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: "Delete a task",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          204: { description: "Deleted" },
          404: { description: "Not found" },
        },
      },
    },
  },
};

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
