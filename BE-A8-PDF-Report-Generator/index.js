// PDF report generator - FlyRank W4/A8.
// Query -> render -> store -> serve. Stage 0: just the server + health check.
const express = require("express");

const app = express();
app.use(express.json());

const PORT = 3000;

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Report API listening on http://localhost:${PORT}`);
});
