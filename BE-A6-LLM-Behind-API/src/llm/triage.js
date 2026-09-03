const fs = require("fs");
const path = require("path");

const { TriageOutputSchema } = require("./schema");
const { callModel, logQuarantine } = require("./client");

const PROMPT_VERSION = "triage-v1";
const PROMPT_PATH = path.join(__dirname, "..", "..", "prompts", "triage-v1.md");
const SYSTEM_PROMPT = fs.readFileSync(PROMPT_PATH, "utf8");

const STUB_RESPONSE = {
  category: "other",
  urgency: "low",
  confidence: 0.5,
  reason: "Stub response - LLM_STUB is set, no model call was made.",
};

// Strips a markdown code fence and any leading chatter, then finds the
// first JSON object in the text. Models like to wrap JSON in ``` or add
// "Sure! Here's the JSON:" in front.
function extractJson(rawText) {
  const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1] : rawText;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model output");
  }
  return candidate.slice(start, end + 1);
}

function safeParseModelOutput(rawText) {
  let jsonText;
  try {
    jsonText = extractJson(rawText);
  } catch (err) {
    return { success: false, stage: "parse", error: err.message };
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    return { success: false, stage: "parse", error: err.message };
  }

  const result = TriageOutputSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, stage: "validate", error: result.error.message };
  }

  return { success: true, data: result.data };
}

/**
 * Runs the triage job: stub mode, kill switch, call + parse + validate,
 * one repair retry, then quarantine on final failure. Never returns raw
 * model text to the caller.
 */
async function triage(text) {
  if (process.env.LLM_STUB === "1") {
    return { ok: true, data: STUB_RESPONSE };
  }

  if (process.env.LLM_ENABLED === "false") {
    return { ok: false, killSwitch: true };
  }

  const userMessage = { role: "user", content: JSON.stringify({ text }) };
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, userMessage];

  let rawText;
  try {
    rawText = await callModel({ messages, promptVersion: PROMPT_VERSION });
  } catch (err) {
    return { ok: false, timeout: err?.name === "APIConnectionTimeoutError", error: err };
  }

  let outcome = safeParseModelOutput(rawText);
  if (outcome.success) return { ok: true, data: outcome.data };

  // Repair once: hand the model its own broken output and the exact error.
  const repairMessages = [
    ...messages,
    { role: "assistant", content: rawText },
    {
      role: "user",
      content: `Your previous answer was rejected for this reason: ${outcome.error}. Return only corrected JSON matching the schema.`,
    },
  ];

  let repairedText;
  try {
    repairedText = await callModel({ messages: repairMessages, promptVersion: PROMPT_VERSION, repair: true });
  } catch (err) {
    logQuarantine({ input: text, promptVersion: PROMPT_VERSION, error: `repair call failed: ${err?.message}` });
    return { ok: false, timeout: err?.name === "APIConnectionTimeoutError", error: err };
  }

  outcome = safeParseModelOutput(repairedText);
  if (outcome.success) return { ok: true, data: outcome.data };

  logQuarantine({
    input: text,
    promptVersion: PROMPT_VERSION,
    firstError: outcome.error,
    rawModelOutput: repairedText,
  });

  return { ok: false, validationFailed: true, error: outcome.error };
}

module.exports = { triage, PROMPT_VERSION };
