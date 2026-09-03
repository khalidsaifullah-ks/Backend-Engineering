// In-memory store for reports. Forgets everything on restart - same lesson
// as A1/A2, still not a bug for this assignment.
const reports = new Map();

module.exports = { reports };
