// Background job API - FlyRank W4/A7, Express lane.
// A fast API whose slow work runs in the background via Inngest.
const express = require("express");
const { serve } = require("inngest/express");

const { inngest } = require("./inngest/client");
const { sayHello, makeReport, heartbeat } = require("./inngest/functions");
const { reports } = require("./inngest/store");

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Stage 2: the fast door. Accept the request, hand the slow work to a
// background function, and answer immediately.
app.post("/reports", async (req, res, next) => {
  try {
    const { topic } = req.body ?? {};

    if (!topic) {
      return res.status(400).json({ error: "Field 'topic' is required" });
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    reports.set(id, { id, topic, status: "pending" });

    await inngest.send({ name: "report/requested", data: { id, topic } });

    res.status(202).json({ id, status: "pending" });
  } catch (err) {
    next(err);
  }
});

// Stage 2: the status endpoint clients poll to learn when the report is ready.
app.get("/reports/:id", (req, res) => {
  const report = reports.get(req.params.id);

  if (!report) {
    return res.status(404).json({ error: `Report ${req.params.id} not found` });
  }

  res.json(report);
});

app.use(
  "/api/inngest",
  serve({ client: inngest, functions: [sayHello, makeReport, heartbeat] })
);

app.listen(PORT, () => {
  console.log(`Background job API listening on http://localhost:${PORT}`);
});
