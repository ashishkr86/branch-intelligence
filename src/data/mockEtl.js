/**
 * DEMO DATA — replace with GET /api/etl/* once backend ready.
 */

/* ─── Pipeline Stages ─── */
export const pipelineStages = [
  { id: "extract", label: "Extract", iconName: "Download", status: "done", rows: "26,555", note: "rows read" },
  { id: "validate", label: "Validate", iconName: "ShieldCheck", status: "done", rows: "26,555", note: "records checked" },
  { id: "clean", label: "Clean", iconName: "Sparkles", status: "done", rows: "26,420", note: "records cleaned" },
  { id: "transform", label: "Transform", iconName: "Wand2", status: "done", rows: "26,420", note: "records prepared" },
  { id: "quality", label: "Quality Check", iconName: "ShieldAlert", status: "warn", rows: "26,420", note: "1 rule flagged" },
  { id: "load", label: "Load MySQL", iconName: "Database", status: "running", rows: "19,024", note: "loading…" },
  { id: "ready", label: "Analytics Ready", iconName: "CheckCircle2", status: "pending", rows: "—", note: "waiting" },
];

/* ─── Current Run ─── */
export const currentRun = {
  id: "ETL-2026-0926-001",
  file: "OTP_REPORT.csv",
  started: "12:31:04 PM",
  duration: "00:02:14",
  status: "RUNNING",
  progress: 72,
};

/* ─── Live Logs ─── */
export const pipelineLogs = [
  { time: "12:31:04", level: "INFO", msg: "File detected: OTP_REPORT.csv" },
  { time: "12:31:06", level: "INFO", msg: "Schema validation completed" },
  { time: "12:31:12", level: "INFO", msg: "Found 17 missing mobile numbers" },
  { time: "12:31:15", level: "INFO", msg: "Transformation completed" },
  { time: "12:32:42", level: "INFO", msg: "Loading records into MySQL (gentech_db)" },
  { time: "12:33:18", level: "INFO", msg: "Loading in progress… 19,024/26,420" },
];

/* ─── Recent Runs ─── */
export const recentRuns = [
  {
    id: "ETL-2026-0926-001",
    file: "OTP_REPORT.csv",
    started: "12:31:04",
    duration: "02:14",
    rowsIn: "26,555",
    rowsLoaded: "26,420",
    rowsDropped: "135",
    dropPct: "0.51%",
    status: "running",
  },
  {
    id: "ETL-2026-0926-000",
    file: "BRANCH.csv",
    started: "12:28:11",
    duration: "00:04",
    rowsIn: "440",
    rowsLoaded: "440",
    rowsDropped: "0",
    dropPct: "0.00%",
    status: "success",
  },
  {
    id: "ETL-2026-0925-012",
    file: "BRANCH_EMPLOYEE.csv",
    started: "Yesterday 6:15 PM",
    duration: "00:18",
    rowsIn: "1,300",
    rowsLoaded: "1,295",
    rowsDropped: "5",
    dropPct: "0.38%",
    status: "warn",
  },
  {
    id: "ETL-2026-0925-011",
    file: "OTP_REPORT.csv",
    started: "Yesterday 3:42 PM",
    duration: "02:08",
    rowsIn: "26,410",
    rowsLoaded: "26,410",
    rowsDropped: "0",
    dropPct: "0.00%",
    status: "success",
  },
  {
    id: "ETL-2026-0924-008",
    file: "OTP_REPORT.csv",
    started: "Sep 24, 10:12 AM",
    duration: "00:00",
    rowsIn: "—",
    rowsLoaded: "—",
    rowsDropped: "—",
    dropPct: "—",
    status: "failed",
    error: "Connection timeout to MySQL server",
  },
];

/* ─── Run Summary ─── */
export const runSummary = {
  rowsRead: "26,555",
  rowsLoaded: "26,420",
  rejected: "135",
  duplicates: "72",
  missing: "38",
  errors: "0",
};