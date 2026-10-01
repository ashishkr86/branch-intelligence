/**
 * DEMO DATA — replace with GET /api/quality once backend ready.
 */

export const qualityScore = {
  score: 98.7,
  delta: "+0.4% vs last week",
  totalChecks: 12,
  passed: 10,
  warnings: 2,
  failed: 0,
};

export const qualityMetrics = [
  { id: "missing", label: "Missing Values", value: 18, threshold: 50, status: "pass" },
  { id: "duplicates", label: "Duplicate Records", value: 0, threshold: 10, status: "pass" },
  { id: "invalid_bm", label: "Invalid BM_CODE", value: 0, threshold: 5, status: "pass" },
  { id: "invalid_phone", label: "Invalid Mobile Numbers", value: 17, threshold: 25, status: "warn" },
  { id: "invalid_dates", label: "Invalid Dates", value: 0, threshold: 5, status: "pass" },
  { id: "invalid_time", label: "Invalid Time Values", value: 1, threshold: 5, status: "pass" },
  { id: "unknown_branch", label: "Unknown Branch Refs", value: 0, threshold: 10, status: "pass" },
  { id: "duplicate_id", label: "Duplicate IDs", value: 0, threshold: 5, status: "pass" },
  { id: "invalid_purpose", label: "Invalid Purpose", value: 2, threshold: 20, status: "warn" },
  { id: "missing_operator", label: "Missing Operator", value: 1, threshold: 20, status: "pass" },
];

export const qualityByTable = [
  {
    table: "branch",
    rows: "440",
    valid: "440",
    invalid: "0",
    nulls: "0",
    score: 100,
    status: "pass",
  },
  {
    table: "branch_employee",
    rows: "1,300",
    valid: "1,295",
    invalid: "0",
    nulls: "5",
    score: 99.6,
    status: "pass",
  },
  {
    table: "otp_report",
    rows: "26,555",
    valid: "26,420",
    invalid: "97",
    nulls: "38",
    score: 99.5,
    status: "warn",
  },
  {
    table: "etl_runs",
    rows: "49",
    valid: "49",
    invalid: "0",
    nulls: "0",
    score: 100,
    status: "pass",
  },
];

export const qualityTrend = {
  labels: ["Sep 20", "Sep 21", "Sep 22", "Sep 23", "Sep 24", "Sep 25", "Sep 26"],
  data: [97.2, 97.8, 98.1, 98.0, 98.3, 98.5, 98.7],
};

export const qualityColumns = [
  { column: "BM_CODE", table: "otp_report", total: "26,555", nulls: 0, valid: "26,555", invalid: 0, status: "pass" },
  { column: "PURPOSE", table: "otp_report", total: "26,555", nulls: 0, valid: "26,553", invalid: 2, status: "warn" },
  { column: "OPERATOR", table: "otp_report", total: "26,555", nulls: 1, valid: "26,554", invalid: 0, status: "warn" },
  { column: "OTP_DATE", table: "otp_report", total: "26,555", nulls: 0, valid: "26,555", invalid: 0, status: "pass" },
  { column: "OTP_TIME", table: "otp_report", total: "26,555", nulls: 0, valid: "26,554", invalid: 1, status: "pass" },
  { column: "MOBILE_NUMBER", table: "otp_report", total: "26,555", nulls: 17, valid: "26,538", invalid: 0, status: "warn" },
  { column: "BM_CODE", table: "branch_employee", total: "1,300", nulls: 0, valid: "1,300", invalid: 0, status: "pass" },
  { column: "EMPLOYEE_NUMBER", table: "branch_employee", total: "1,300", nulls: 0, valid: "1,300", invalid: 0, status: "pass" },
];