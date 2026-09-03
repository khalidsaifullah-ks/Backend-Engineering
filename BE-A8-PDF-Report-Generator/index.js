// PDF report generator - FlyRank W4/A8.
// Query -> render -> store -> serve.
const express = require("express");
const path = require("path");
const fs = require("fs");

const { db } = require("./db");
const { getReportData } = require("./report");
const { renderReportPdf } = require("./render");

const app = express();
app.use(express.json());

const PORT = 3000;
const REPORTS_DIR = path.join(__dirname, "reports");
fs.mkdirSync(REPORTS_DIR, { recursive: true });

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// POST /reports - runs the whole pipeline right here: query, render to
// reports/<id>.pdf, insert the row. Takes a few seconds; that is allowed.
app.post("/reports", async (req, res, next) => {
  try {
    const data = getReportData();
    const insert = db
      .prepare("INSERT INTO reports (path, created_at) VALUES (?, ?)")
      .run("", new Date().toISOString());
    const id = Number(insert.lastInsertRowid);

    const filePath = path.join(REPORTS_DIR, `${id}.pdf`);
    await renderReportPdf(data, filePath);

    db.prepare("UPDATE reports SET path = ? WHERE id = ?").run(filePath, id);

    res.status(201).json({ id, file: `/reports/${id}/file` });
  } catch (err) {
    next(err);
  }
});

app.get("/reports/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(id);

  if (!row) {
    return res.status(404).json({ error: `Report ${req.params.id} not found` });
  }

  res.json({ id: row.id, created_at: row.created_at, file: `/reports/${row.id}/file` });
});

// GET /reports/:id/file - the only endpoint that moves the actual bytes.
app.get("/reports/:id/file", (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(id);

  if (!row || !fs.existsSync(row.path)) {
    return res.status(404).json({ error: `Report ${req.params.id} not found` });
  }

  res.sendFile(row.path);
});

app.use((req, res) => {
  res.status(404).json({ error: `No endpoint for ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Report API listening on http://localhost:${PORT}`);
});
