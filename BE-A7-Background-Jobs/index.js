// Background job API - FlyRank W4/A7, Express lane.
// A fast API whose slow work runs in the background via Inngest.
const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Background job API listening on http://localhost:${PORT}`);
});
