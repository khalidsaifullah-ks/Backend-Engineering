// Runs evals/cases.json against the local /triage endpoint and reports
// how many matched on the "category" field.
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.EVAL_BASE_URL || "http://localhost:3000";
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, "cases.json"), "utf8"));

async function runCase(testCase) {
  const res = await fetch(`${BASE_URL}/triage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: testCase.text }),
  });
  const body = await res.json();
  const matched = res.ok && body.category === testCase.expectedCategory;
  return { ...testCase, actual: body, matched };
}

async function main() {
  const results = [];
  for (const testCase of cases) {
    results.push(await runCase(testCase));
  }

  const passed = results.filter((r) => r.matched).length;
  console.log(`\nEval result: ${passed}/${results.length} matched on category\n`);

  for (const r of results) {
    const status = r.matched ? "PASS" : "FAIL";
    console.log(`[${status}] "${r.text.slice(0, 50)}" -> expected=${r.expectedCategory} actual=${r.actual.category ?? r.actual.error}`);
  }
}

main();
