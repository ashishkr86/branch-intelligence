const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Overview
  overview: () => apiFetch("/api/overview"),

  // Branches
  branches: (params = {}) => apiFetch(`/api/branches?${new URLSearchParams(params)}`),
  branchDetail: (bm) => apiFetch(`/api/branches/${bm}`),

  // Workforce
  workforce: (params = {}) => apiFetch(`/api/workforce?${new URLSearchParams(params)}`),

  // OTP
  otp: (params = {}) => apiFetch(`/api/otp?${new URLSearchParams(params)}`),
  otpSummary: () => apiFetch("/api/otp/summary"),

  // Operators
  operators: (params = {}) => apiFetch(`/api/operators?${new URLSearchParams(params)}`),
  operatorDetail: (name) => apiFetch(`/api/operators/${encodeURIComponent(name)}`),
  operatorRecords: (name, limit = 100) =>
    apiFetch(`/api/operators/${encodeURIComponent(name)}/records?limit=${limit}`),

  // ETL
  etlHistory: () => apiFetch("/api/etl/history"),
  etlStatus: () => apiFetch("/api/etl/status"),

  // Monitoring
  monitoring: () => apiFetch("/api/monitoring"),

  // Analytics + BI
  analytics: (params = {}) => apiFetch(`/api/analytics?${new URLSearchParams(params)}`),
  bi: (params = {}) => apiFetch(`/api/bi?${new URLSearchParams(params)}`),

  // Live Dashboard
  liveDashboard: (params = {}) =>
    apiFetch(`/api/dashboards/live?${new URLSearchParams(params)}`),

  // Ingestion
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/ingestion/upload`, {
      method: "POST",
      body: formData,
    }).then((r) => {
      if (!r.ok) throw new Error(`Upload failed: ${r.status}`);
      return r.json();
    });
  },
  ingestedFiles: () => apiFetch("/api/ingestion/files"),
  recentRuns: () => apiFetch("/api/ingestion/recent"),

  // Quality
  quality: () => apiFetch("/api/quality"),

  // Export
  exportViews: () => apiFetch("/api/export/views"),
  exportView: (view, format = "json") =>
    apiFetch(`/api/export/${view}?format=${format}`),
  exportCsvUrl: (view) => `${API_BASE}/api/export/${view}?format=csv`,

  // Duplicates
  duplicates: () => apiFetch("/api/duplicates"),
  duplicateTable: (table) => apiFetch(`/api/duplicates/${table}`),
  cleanDuplicates: (table, dryRun = true) =>
    apiFetch(`/api/duplicates/clean/${table}?dry_run=${dryRun}`, { method: "POST" }),

  // Errors
  errors: (params = {}) => apiFetch(`/api/errors?${new URLSearchParams(params)}`),
  errorStats: (hours = 24) => apiFetch(`/api/errors/stats?hours=${hours}`),
  resolveError: (id) => apiFetch(`/api/errors/${id}/resolve`, { method: "POST" }),
  resolveAllErrors: () => apiFetch("/api/errors/resolve-all", { method: "POST" }),
  clearErrors: () => apiFetch("/api/errors/clear", { method: "DELETE" }),
  testError: () => apiFetch("/api/errors/test", { method: "POST" }),

  // Column Mapping
  mappingSchemas: () => apiFetch("/api/mapping/schemas"),
  mappingTemplates: () => apiFetch("/api/mapping/templates"),
  mappingSaveTemplate: (payload) =>
    apiFetch("/api/mapping/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  mappingDeleteTemplate: (id) =>
    apiFetch(`/api/mapping/templates/${id}`, { method: "DELETE" }),

  mappingDetect: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/mapping/detect`, {
      method: "POST",
      body: formData,
    }).then((r) => {
      if (!r.ok) throw new Error(`Detect failed: ${r.status}`);
      return r.json();
    });
  },

  mappingRun: (file, targetTable, mapping) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("targetTable", targetTable);
    formData.append("mapping", JSON.stringify(mapping));
    return fetch(`${API_BASE}/api/mapping/run`, {
      method: "POST",
      body: formData,
    }).then((r) => {
      if (!r.ok) throw new Error(`Run failed: ${r.status}`);
      return r.json();
    });
  },

  // Alerts
  panicAlerts: (params = {}) =>
    apiFetch(`/api/alerts/panic?${new URLSearchParams(params)}`),
  smokeAlerts: (params = {}) =>
    apiFetch(`/api/alerts/smoke?${new URLSearchParams(params)}`),
  alertsSummary: () => apiFetch("/api/alerts/summary"),

  // Alerts — create (single)
  createPanicAlert: (payload) =>
    apiFetch("/api/alerts/panic", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createSmokeAlert: (payload) =>
    apiFetch("/api/alerts/smoke", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Alerts — import (CSV / Excel)
  importPanicAlerts: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/alerts/panic/import`, {
      method: "POST",
      body: formData,
    }).then((r) => {
      if (!r.ok) throw new Error(`Import failed: ${r.status}`);
      return r.json();
    });
  },
  importSmokeAlerts: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/alerts/smoke/import`, {
      method: "POST",
      body: formData,
    }).then((r) => {
      if (!r.ok) throw new Error(`Import failed: ${r.status}`);
      return r.json();
    });
  },
};