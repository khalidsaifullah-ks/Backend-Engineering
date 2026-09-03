// Inngest functions - background jobs and cron jobs for the report API.
const { inngest } = require("./client");

// Stage 1: a minimal function to prove the Inngest wiring works end-to-end.
const sayHello = inngest.createFunction(
  { id: "say-hello" },
  { event: "test/hello" },
  async ({ step }) => {
    await step.sleep("wait-a-bit", "5s");
    return "Hello from the background!";
  }
);

module.exports = { sayHello };
