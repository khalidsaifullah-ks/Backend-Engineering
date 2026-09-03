// Fires the same set of requests at both APIs and prints status + body.
// Usage: node docs/compare.mjs mine   (hand-built, must be running)
//        node docs/compare.mjs ai     (ai-version, must be running)
// "mine" = the hand-built API, "ai" = the quarantined AI version.
const targets = {
  mine: "http://localhost:3000",
  ai: "http://localhost:4000",
  rematch: "http://localhost:4001",
};
const base = targets[process.argv[2]];
if (!base) {
  console.error("Usage: node docs/compare.mjs mine|ai");
  process.exit(1);
}

const cases = [
  ["GET  /tasks", "GET", "/tasks", null],
  ["GET  /tasks/99", "GET", "/tasks/99", null],
  ["POST valid title", "POST", "/tasks", { title: "Buy milk" }],
  ["POST {}", "POST", "/tasks", {}],
  ["POST title=123", "POST", "/tasks", { title: 123 }],
  ['POST title="   "', "POST", "/tasks", { title: "   " }],
  ["PUT  done only (partial)", "PUT", "/tasks/4", { done: true }],
  ["PUT  {}", "PUT", "/tasks/1", {}],
  ["PUT  done='yes'", "PUT", "/tasks/1", { title: "x", done: "yes" }],
  ["GET  /nope (unknown route)", "GET", "/nope", null],
  ["POST malformed JSON", "POST", "/tasks", "{oops}"],
  ["DELETE /tasks/4", "DELETE", "/tasks/4", null],
  ["POST after delete (id reuse?)", "POST", "/tasks", { title: "id reuse?" }],
  ["GET  /tasks (final)", "GET", "/tasks", null],
  ["GET  /docs", "GET", "/docs/", null],
];

for (const [label, method, path, body] of cases) {
  const init = { method };
  if (body !== null) {
    init.headers = { "Content-Type": "application/json" };
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  try {
    const res = await fetch(base + path, init);
    const text = await res.text();
    const ct = res.headers.get("content-type") ?? "";
    const shown = ct.includes("html")
      ? `<HTML ${text.length} bytes>`
      : text.slice(0, 120);
    console.log(`${String(res.status).padEnd(4)} ${label.padEnd(30)} ${shown}`);
  } catch (err) {
    console.log(`ERR  ${label.padEnd(30)} ${err.message}`);
  }
}
