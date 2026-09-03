// Quick manual check: print the report object as JSON and eyeball the numbers.
// FlyRank W4/A8, Stage 2.
const { getReportData } = require("./report");

const data = getReportData();
console.log(
  JSON.stringify(
    {
      totalOrders: data.totalOrders,
      totalRevenue: data.totalRevenue,
      topProducts: data.topProducts,
      ordersPerDay: data.ordersPerDay,
      allOrdersCount: data.allOrders.length,
    },
    null,
    2
  )
);
