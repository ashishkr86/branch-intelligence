/**
 * DEMO DATA — replace with API calls once backend is ready.
 *
 * Future API endpoints:
 *   GET /api/overview → { kpis, otpTrend, purposes, regions, pipeline, activity }
 *   GET /api/ingestion/files → { uploads }
 */

export const kpis = [
  { id: "branches", label: "Branches", value: "440", delta: "↑ 3.2% this month", deltaTone: "ok", spark: [400, 405, 410, 420, 425, 435, 440] },
  { id: "employees", label: "Employees", value: "1,300+", delta: "Across all branches", deltaTone: "soft", spark: [1150, 1180, 1200, 1220, 1250, 1280, 1300] },
  { id: "otp", label: "OTP Records", value: "26,555", delta: "↑ 5.4% today", deltaTone: "ok", spark: [840, 920, 1100, 980, 1260, 1180, 1320, 1725] },
  { id: "etl", label: "ETL Health", value: "98.7%", delta: "● Healthy pipeline", deltaTone: "ok", spark: [96, 97, 97.5, 98, 98.2, 98.5, 98.7] },
];

export const otpTrend = {
  labels: ["Sep 7", "Sep 8", "Sep 9", "Sep 10", "Sep 11", "Sep 12", "Sep 13", "Sep 14", "Sep 15", "Sep 16", "Sep 17", "Sep 18", "Sep 19", "Sep 20", "Sep 21", "Sep 22", "Sep 23", "Sep 24", "Sep 25", "Sep 26"],
  data: [840, 920, 1100, 980, 1260, 1180, 1320, 1410, 1240, 1510, 1380, 1600, 1490, 1710, 1580, 1430, 1550, 1640, 1510, 1725],
};

export const otpPurposes = {
  labels: ["Customer Purpose", "Final Vault Closing", "Audit Purpose", "Packet Counting", "Other Purpose"],
  data: [12400, 6200, 4100, 2600, 1255],
  colors: ["#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#64748b"],
};

export const regions = {
  labels: ["North", "South", "East", "West", "Central"],
  data: [120, 95, 78, 92, 55],
};

export const pipelineHealth = [
  { name: "Branch ETL", status: "ok" },
  { name: "Employee ETL", status: "ok" },
  { name: "OTP ETL", status: "ok" },
  { name: "Data Quality", status: "warn" },
];

export const recentActivity = [
  { file: "OTP_REPORT.csv", rows: "26,555", status: "loaded", time: "10:42 AM" },
  { file: "BRANCH.csv", rows: "440", status: "loaded", time: "10:40 AM" },
  { file: "BRANCH_EMPLOYEE.csv", rows: "1,300", status: "review", time: "10:39 AM" },
];

export const recentUploads = [
  { file: "OTP_REPORT.csv", size: "4.2 MB", rows: "26,555", validation: "Passed", status: "loaded", time: "10:42 AM" },
  { file: "BRANCH.csv", size: "82 KB", rows: "440", validation: "Passed", status: "ready", time: "10:40 AM" },
  { file: "BRANCH_EMPLOYEE.csv", size: "210 KB", rows: "1,300", validation: "Warning", status: "review", time: "10:39 AM" },
];

export const supportedDatasets = [
  { id: "branch", name: "Branch", description: "Branch master data", iconName: "Building2", accent: "#06b6d4" },
  { id: "employee", name: "Employee", description: "Workforce information", iconName: "Users", accent: "#8b5cf6" },
  { id: "otp", name: "OTP Report", description: "OTP activity records", iconName: "KeyRound", accent: "#f59e0b" },
  { id: "etl", name: "ETL Logs", description: "Pipeline execution logs", iconName: "TerminalSquare", accent: "#10b981" },
];

export const ingestionSteps = [
  { id: 1, label: "Upload", description: "Receive file" },
  { id: 2, label: "Validate", description: "Check schema" },
  { id: 3, label: "Load", description: "Send to ETL" },
];