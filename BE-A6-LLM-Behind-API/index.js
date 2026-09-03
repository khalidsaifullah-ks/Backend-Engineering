// Put an LLM behind your API - FlyRank W7/A17.
// POST /triage: a support message in, clean validated JSON out - with a
// real timeout, retries on the right errors only, a cost log and a kill
// switch. See JOB-CARD.md for the contract and prompts/triage-v1.md for
// the spec handed to the model.
const express = require("express");

const triageRoute = require("./src/routes/triage");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(triageRoute);

app.get("/", (req, res) => {
  res.status(200).json({ message: "LLM-behind-API is running. POST /triage to classify a support message." });
});

app.use((req, res) => {
  res.status(404).json({ error: `No endpoint for ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
