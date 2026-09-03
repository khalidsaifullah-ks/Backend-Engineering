// Manual checkpoint: render the current data into reports/test.pdf.
// FlyRank W4/A8, Stage 3.
const fs = require("fs");
const path = require("path");
const { getReportData } = require("./report");
const { renderReportPdf } = require("./render");

async function main() {
  const outDir = path.join(__dirname, "reports");
  fs.mkdirSync(outDir, { recursive: true });

  const data = getReportData();
  const outputPath = path.join(outDir, "test.pdf");
  await renderReportPdf(data, outputPath);

  console.log(`Rendered ${outputPath}`);
}

main();
