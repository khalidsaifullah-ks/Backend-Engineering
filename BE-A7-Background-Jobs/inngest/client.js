// Inngest client - the connection between our app and the Inngest Dev Server.
const { Inngest } = require("inngest");

const inngest = new Inngest({ id: "report-api" });

module.exports = { inngest };
