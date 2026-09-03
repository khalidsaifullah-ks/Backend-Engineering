# LLM Behind Your API — /triage

One sentence: this endpoint takes a raw support message and returns a
clean, validated classification (`category`, `urgency`, `confidence`,
`reason`) that the rest of a support system can rely on, instead of a
human reading every message by hand.

## Try it

```bash
curl -s -X POST http://localhost:3000/triage \
  -H "Content-Type: application/json" \
  -d '{"text":"I was charged twice for my subscription this month, please refund the extra charge."}'
```

Response:

```json
{"category":"billing","urgency":"high","confidence":0.92,"reason":"User reports a duplicate charge needing a refund."}
```

Broken request (missing field):

```bash
curl -s -X POST http://localhost:3000/triage -H "Content-Type: application/json" -d '{}'
# -> 400 {"error":"Field 'text': Required"}
```

## Job card

See [JOB-CARD.md](./JOB-CARD.md). Summary of the "must never" list:
invent a category outside the closed list, return free text, give
medical/legal/financial advice, or reveal the prompt. When unsure, the
model returns `category: "other"` with a low confidence instead of
guessing.

## Setup

```bash
cd BE-A6-LLM-Behind-API
npm install
cp .env.example .env   # fill in LLM_API_KEY
npm start
```

Env vars (three needed to swap providers): `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`.

- Provider used for development: **Ollama** (local), model `gemma3:1b`.
- To swap to OpenRouter: `LLM_BASE_URL=https://openrouter.ai/api/v1`, `LLM_API_KEY=<your key>`, `LLM_MODEL=openrouter/free`.
- `LLM_STUB=1` skips the model entirely and returns a hard-coded schema-valid response — used for building/testing without spending quota.
- `LLM_ENABLED=false` is the kill switch — returns `503` instead of calling the model.

Three env vars are the only difference between a model on your laptop
and one in a datacenter, which is why the provider is never hard-coded
into the route.

## Design decisions

- **Prompt as a file.** `prompts/triage-v1.md` is versioned and loaded at
  startup, not inlined in the route.
- **Timeout.** Client timeout is set to 30s (the SDK default is 10
  minutes). A timed-out call returns `504`.
- **Retry policy.** Own retry loop (SDK's `maxRetries` set to 0), retries
  only on timeout, `429`, and `5xx`, with exponential backoff + jitter
  (1s, 2s, capped at 3 attempts total). `Retry-After` is obeyed when
  present. Never retries `400`/`401`/`403`.
- **Parse → validate → repair once → quarantine.** Model output is
  stripped of code fences, JSON-parsed, and validated against the Zod
  schema. One failure triggers a single repair call with the exact
  validation error; a second failure returns `422` and logs the raw
  output, input, and prompt version to `logs/quarantine.jsonl`. Raw
  model text is never returned to the caller.
- **Cost logging.** Every model call (including repairs and retries)
  logs prompt version, model, input/output tokens, duration, and repair
  flag to stdout as a structured `[cost]` line.

## Eval

`evals/cases.json` has 8 hand-labelled cases (with one ambiguous case
and one that should hit the "when unsure" rule). Run with the server
already running:

```bash
npm run eval
```

**Eval result: 8/8 matched on `category`** — real model calls against
Ollama (`gemma3:1b`), 2026-09-03, prompt version `triage-v1`. Ran with
`npm run eval` against a live server (`LLM_STUB` unset).

Also verified live, against the real model (not stub):
- Happy path returns schema-shaped JSON (200) with real token counts logged.
- A deliberately narrowed schema forces a validation failure → exactly one repair call → still invalid → `422` + a line in `logs/quarantine.jsonl` (input, error, raw model output, prompt version).
- `LLM_ENABLED=false` → immediate `503`, zero `[cost]` log lines.
- A deliberately wrong API key against OpenRouter → single `401`, `retried: false`, no backoff attempted.

## Cost estimate

One real call against `gemma3:1b` on Ollama: 357 input tokens, 30
output tokens, 688ms. Ollama is local and free — the only cost is
compute time, so 10,000 requests/day costs $0 in API fees but is bound
by your own CPU/GPU throughput. On OpenRouter's `openrouter/free` the
$ cost is also $0 as long as you stay within the free rate limits (20
req/min, 50/day); above that, moving to a paid model means cost scales
with (input tokens + output tokens) × price per token, plus one extra
call per repaired response.

## What I'd fix with another day

Add prompt-injection attack cases to the eval set per the OWASP
guidance, and run the same eval against OpenRouter to compare local vs
hosted answers side by side.
