const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

// A real timeout - the SDK default is ten minutes, which is not a real
// timeout for an HTTP endpoint. 30s, no SDK-internal retries: we do our
// own retry policy below so we can choose exactly which errors to retry.
const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
  timeout: 30000,
  maxRetries: 0,
});

const LOG_DIR = path.join(__dirname, "..", "..", "logs");
const QUARANTINE_FILE = path.join(LOG_DIR, "quarantine.jsonl");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function logCost(entry) {
  ensureLogDir();
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  console.log(`[cost] ${line}`);
}

function logQuarantine(entry) {
  ensureLogDir();
  fs.appendFileSync(QUARANTINE_FILE, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retries only on timeouts, 429 and 5xx. Never on 400/401/403 - those are
// still broken on the next attempt and, on a metered free tier, every
// pointless retry burns real quota.
function isRetryable(err) {
  if (err?.name === "APIConnectionTimeoutError" || err?.code === "ETIMEDOUT") return true;
  const status = err?.status;
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

function retryAfterMs(err) {
  const header = err?.headers?.["retry-after"];
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const date = new Date(header).getTime();
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

/**
 * Calls the chat completion endpoint with an explicit timeout and a bounded
 * retry policy (exponential backoff + jitter), and logs cost/timing for
 * every attempt.
 */
async function callModel({ messages, promptVersion, repair = false }) {
  const maxAttempts = 3; // one initial call + up to 2 retries
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now();
    try {
      const res = await client.chat.completions.create({
        model: process.env.LLM_MODEL,
        temperature: 0.2,
        messages,
      });

      logCost({
        promptVersion,
        model: process.env.LLM_MODEL,
        inputTokens: res.usage?.prompt_tokens ?? null,
        outputTokens: res.usage?.completion_tokens ?? null,
        durationMs: Date.now() - start,
        repair,
        attempt,
      });

      return res.choices[0].message.content;
    } catch (err) {
      lastErr = err;
      const retryable = isRetryable(err);
      logCost({
        promptVersion,
        model: process.env.LLM_MODEL,
        durationMs: Date.now() - start,
        repair,
        attempt,
        error: err?.message,
        status: err?.status,
        retried: retryable && attempt < maxAttempts,
      });

      if (!retryable || attempt === maxAttempts) throw err;

      const explicitWait = retryAfterMs(err);
      const backoff = explicitWait ?? 2 ** (attempt - 1) * 1000 + Math.random() * 250;
      await sleep(backoff);
    }
  }

  throw lastErr;
}

module.exports = { callModel, logQuarantine, isRetryable };
