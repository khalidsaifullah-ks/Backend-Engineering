// Task API - an in-memory CRUD to-do API (FlyRank W2/A1, Express lane).
const express = require("express");

const app = express();
const PORT = 3000;

// Stage 1 - the front door: a machine-readable description of this API.
app.get("/", (req, res) => {
  res.json({
    name: "Task API",
    version: "1.0",
    endpoints: ["/tasks"],
  });
});

// Stage 1 - liveness probe. Real deployments poll exactly this.
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Task API listening on http://localhost:${PORT}`);
});
