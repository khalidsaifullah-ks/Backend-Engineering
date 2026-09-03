# AI Decision Flow — React Flow + Inngest

FlyRank Internship · Backend AI Engineering · Week 7 · BE-09

A visual workflow editor where each node is an AI decision step. Every node's
prompt is sent to an LLM that must answer only **YES** or **NO**, and that
answer picks which edge the workflow follows next. The graph is edited with
React Flow; execution runs as a durable Inngest function, one step per node.

## Stack

- Next.js 15 (App Router, TypeScript)
- `@xyflow/react` (React Flow) — the canvas, nodes, edges
- `inngest` — durable step-based workflow execution
- `openai` SDK — works with OpenAI or any OpenAI-compatible endpoint (Groq, etc.)
- Hand-rolled shadcn-style UI primitives (Button, Textarea, Card, Badge) —
  the `shadcn` CLI's Tailwind v4 detection didn't cooperate in this environment,
  so the same `components.json` + `cn()` + CVA pattern was set up by hand.

## Setup

```bash
cd BE-09-AI-Decision-Flow
npm install
cp .env.example .env.local   # fill in OPENAI_API_KEY (or Groq key + OPENAI_BASE_URL)
```

Run the app and the Inngest dev server in two terminals:

```bash
npm run dev
npx inngest-cli dev -u http://localhost:3000/api/inngest --port 8299
```

Open http://localhost:3000 for the editor and http://localhost:8299 for the
Inngest dev dashboard (function runs, step-by-step traces, retries).

> If port 8299 is already in use on your machine, pick another port with
> `--port` and update `INNGEST_DEV_URL` in `.env.local` to match.

## Using it

1. The canvas starts with one decision node. Click **+ Add node** for more,
   and edit each node's prompt directly in its textarea.
2. Drag from a node's **green (YES)** or **red (NO)** handle to another node
   to wire up a branch. Example: *"Is this a support request?"* → YES →
   Support node, NO → Sales node.
3. Click **Run workflow**. This posts the graph to `/api/run`, which fires an
   `workflow/run` event into Inngest. The Inngest function walks the graph
   starting from the first node: each node is one `step.run()` call that asks
   the LLM the node's prompt and gets back exactly `YES` or `NO`, then follows
   the matching edge. The frontend polls for the result and lights up each
   node with its answer, plus a full log in the side panel.
4. **Export JSON** / **Import JSON** save and reload the whole graph.

## How the pieces fit

```
Browser (React Flow canvas)
  │  POST /api/run  { nodes, edges, startNodeId }
  ▼
Next.js route → inngest.send("workflow/run", ...)
  ▼
Inngest dev server queues the event
  ▼
/api/inngest (the function) — runWorkflow
  │  for each node along the path:
  │    step.run("decide-<nodeId>") → OpenAI chat completion,
  │    forced to answer YES or NO → pick the matching edge
  ▼
Browser polls GET /api/run/[eventId] against the Inngest REST API
  until the run is Completed, then renders the execution log
```

Each node maps 1:1 to an Inngest step, so a crash mid-run resumes from the
last completed step instead of re-asking every prior node.

## Notes / known limits

- This is the core build (Phases 1–3) plus JSON export/import and visual
  execution state from Phase 4's "pick at least 3" list. Execution logs panel
  and animated status badges are also included; retry-on-failure, execution
  history across multiple runs, and saving workflows server-side were left out
  to keep this within the assignment's time budget.
- The LLM call has no key configured by default — running the workflow
  without `OPENAI_API_KEY` set will show a `401 Invalid API Key` in the
  Inngest dev dashboard, which is expected and confirms the trigger → step →
  LLM → branch pipeline is wired correctly end to end.
- `node:sqlite`-style native deps were avoided entirely; no database is used
  here — graph state lives in the browser and can be exported/imported as JSON.
