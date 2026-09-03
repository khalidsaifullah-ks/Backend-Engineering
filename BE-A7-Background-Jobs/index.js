// Background job API - FlyRank W4/A7, Express lane.
// A fast API whose slow work runs in the background via Inngest.
const express = require("express");
const { serve } = require("inngest/express");

const { inngest } = require("./inngest/client");
const { sayHello } = require("./inngest/functions");

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/inngest", serve({ client: inngest, functions: [sayHello] }));

app.listen(PORT, () => {
  console.log(`Background job API listening on http://localhost:${PORT}`);
});
