// Inngest functions - background jobs and cron jobs for the report API.
const { inngest } = require("./client");
const { reports } = require("./store");

// Stage 1: a minimal function to prove the Inngest wiring works end-to-end.
const sayHello = inngest.createFunction(
  { id: "say-hello" },
  { event: "test/hello" },
  async ({ step }) => {
    await step.sleep("wait-a-bit", "5s");
    return "Hello from the background!";
  }
);

// Stage 2 (+3): the slow work behind POST /reports.
// Two steps: a stand-in for slow work (sleep), then building the result (run).
const makeReport = inngest.createFunction(
  {
    id: "make-report",
    retries: 2,
    onFailure: async ({ event }) => {
      // event.data.event is the original report/requested event that failed
      // after exhausting retries.
      const { id } = event.data.event.data;
      const existing = reports.get(id);
      if (existing) {
        reports.set(id, { ...existing, status: "failed" });
      }
    },
  },
  { event: "report/requested" },
  async ({ event, step }) => {
    const { id, topic } = event.data;

    // Idempotency guard (stretch): if this event is ever redelivered and the
    // report is already done, skip rebuilding it.
    const existing = reports.get(id);
    if (existing && existing.status === "done") {
      return existing;
    }

    await step.sleep("do-the-slow-work", "8s");

    const result = await step.run("build-report", () => {
      // Stage 3: a deliberate failure path to observe Inngest's retries.
      if (topic === "fail") {
        throw new Error("The report oven is broken!");
      }

      return `Report on "${topic}": ${topic} is a great topic with 3 key insights.`;
    });

    reports.set(id, { id, topic, status: "done", result });
    return reports.get(id);
  }
);

// Stage 4: a cron job triggered by the clock alone, no request or event.
const heartbeat = inngest.createFunction(
  { id: "heartbeat" },
  { cron: "* * * * *" },
  async () => {
    let pending = 0;
    let done = 0;
    let failed = 0;

    for (const report of reports.values()) {
      if (report.status === "pending") pending += 1;
      else if (report.status === "done") done += 1;
      else if (report.status === "failed") failed += 1;
    }

    console.log(
      `[heartbeat] pending=${pending} done=${done} failed=${failed}`
    );

    return { pending, done, failed };
  }
);

module.exports = { sayHello, makeReport, heartbeat };
