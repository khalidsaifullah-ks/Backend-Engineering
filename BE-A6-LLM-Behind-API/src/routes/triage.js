const express = require("express");

const { TriageInputSchema } = require("../llm/schema");
const { triage } = require("../llm/triage");

const router = express.Router();

router.post("/triage", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const parsedInput = TriageInputSchema.safeParse(body);
    if (!parsedInput.success) {
      const issue = parsedInput.error.issues[0];
      return res.status(400).json({ error: `Field '${issue.path.join(".")}': ${issue.message}` });
    }

    const result = await triage(parsedInput.data.text);

    if (result.ok) {
      return res.status(200).json(result.data);
    }

    if (result.killSwitch) {
      return res.status(503).json({ error: "LLM feature is currently disabled" });
    }

    if (result.timeout) {
      return res.status(504).json({ error: "The model did not respond in time" });
    }

    if (result.validationFailed) {
      return res.status(422).json({ error: "Model output could not be validated after one repair attempt" });
    }

    // Any other upstream failure (e.g. bad key, exhausted retries).
    return res.status(502).json({ error: "Upstream model call failed" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
