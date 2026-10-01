import { useRef, useState } from "react";
import {
  UploadCloud, Database, CheckCircle2, XCircle, Loader2,
  FileText, Sparkles, RefreshCw, AlertCircle, Shield, Flame,
} from "lucide-react";
import { Card, SectionHeader, Badge, StatusDot, ProgressBar } from "../components/ui/primitives";
import { ErrorPanel } from "../components/ui/ErrorPanel";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

export default function Ingestion() {
  const files = useApi(() => api.ingestedFiles());
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are supported.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setResult(null);
    setError(null);

    const tick = setInterval(() => {
      setProgress((p) => Math.min(90, p + 10));
    }, 200);

    try {
      const res = await api.uploadFile(file);
      setProgress(100);
      setResult(res);
      files.refetch();
    } catch (e) {
      setError(e.message);
    } finally {
      clearInterval(tick);
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 800);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <Badge variant="accent"><Database className="h-3 w-3" /> Ingestion Center</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Data Ingestion</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Upload CSV files — the backend runs the ETL and loads into MySQL
          </p>
        </div>
        <button
          onClick={files.refetch}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Supported datasets */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DatasetHint
          icon={Shield}
          title="Panic Alerts"
          hint="BM_CODE · BRANCH_NAME · ALERT_TYPE · ALERT_DATE · ALERT_TIME · OPERATOR · COMMENTS · STATUS"
          tone="err"
        />
        <DatasetHint
          icon={Flame}
          title="Smoke Alerts"
          hint="BM_CODE · BRANCH_NAME · ALERT_TYPE · ALERT_DATE · ALERT_TIME · OPERATOR · COMMENTS · STATUS"
          tone="warn"
        />
        <DatasetHint
          icon={Database}
          title="OTP Report"
          hint="BM_CODE · PURPOSE · OPERATOR · OTP_DATE · OTP_TIME · MOBILE_NUMBER"
          tone="accent"
        />
        <DatasetHint
          icon={FileText}
          title="Branch / Employee"
          hint="BM_CODE · BRANCH_NAME · REGION / EMPLOYEE_NAME · EMPLOYEE_NUMBER"
          tone="ok"
        />
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
        onDrop={onDrop}
        className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
          drag ? "border-accent bg-accent/5" : "border-line-strong bg-bg-elevated hover:border-accent/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        />
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
          {uploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <UploadCloud className="h-8 w-8" />}
        </div>
        <h3 className="mt-5 text-lg font-semibold text-ink">
          {uploading ? "Uploading and running ETL…" : "Drag & drop your CSV here"}
        </h3>
        <p className="mt-2 text-sm text-ink-soft">
          CSV only · Max 50 MB · Panic, Smoke, OTP, Branch and Employee datasets auto-detected
        </p>

        {uploading ? (
          <div className="mx-auto mt-6 max-w-md">
            <ProgressBar value={progress} tone="accent" animated size="md" showLabel />
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="focus-ring mt-6 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg shadow-lg shadow-accent/20 hover:brightness-110"
          >
            Browse Files
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <Card className="border-err/30 bg-err/5 p-5">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-err" />
            <div>
              <div className="text-sm font-semibold text-ink">Upload failed</div>
              <div className="mt-1 text-xs text-ink-soft">{error}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card className={`border-${result.etl.status === "SUCCESS" ? "ok" : "warn"}/30 bg-${result.etl.status === "SUCCESS" ? "ok" : "warn"}/5 p-5`}>
          <div className="flex items-start gap-4">
            <div className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg ${result.etl.status === "SUCCESS" ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>
              {result.etl.status === "SUCCESS" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span className="text-2xs font-semibold uppercase tracking-wider text-accent">
                  ETL Result
                </span>
                <StatusDot status={result.etl.status === "SUCCESS" ? "ok" : "warn"} pulse />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="File" value={result.filename} mono />
                <Field label="Rows In" value={result.etl.rows_in.toLocaleString()} mono />
                <Field label="Loaded" value={result.etl.rows_loaded.toLocaleString()} mono tone="text-ok" />
                <Field label="Dropped" value={result.etl.rows_dropped.toLocaleString()} mono tone="text-warn" />
              </div>
              <div className="mt-3 text-xs text-ink-soft">{result.etl.message}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Files list */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div>
            <h3 className="flex items-center gap-2 text-md font-semibold text-ink">
              <FileText className="h-4 w-4 text-accent" /> Landing Zone Files
            </h3>
            <p className="mt-0.5 text-xs text-ink-soft">
              Files in `data/landing/` — auto-detected by name
            </p>
          </div>
        </div>
        {files.loading ? (
          <div className="p-6 text-center text-sm text-ink-mute">Loading files…</div>
        ) : files.error ? (
          <div className="p-6"><ErrorPanel message={files.error} onRetry={files.refetch} /></div>
        ) : files.data.files.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-mute">
            No files yet. Upload a CSV above.
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-subtle/50">
                <tr>
                  {["File", "Size", "Rows in DB", "Modified"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {files.data.files.map((f) => (
                  <tr key={f.file} className="hover:bg-bg-hover/40">
                    <td className="mono-num whitespace-nowrap px-6 py-3.5 text-ink">{f.file}</td>
                    <td className="mono-num whitespace-nowrap px-6 py-3.5 text-ink-soft">{f.size_label}</td>
                    <td className="mono-num whitespace-nowrap px-6 py-3.5 text-ok">
                      {f.rows !== null ? f.rows.toLocaleString() : "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-xs text-ink-mute">{f.modified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value, mono = false, tone = "text-ink" }) {
  return (
    <div>
      <div className="text-2xs font-semibold uppercase tracking-wider text-ink-mute">{label}</div>
      <div className={`mt-0.5 truncate text-sm font-semibold ${mono ? "mono-num" : ""} ${tone}`}>{value}</div>
    </div>
  );
}

function DatasetHint({ icon: Icon, title, hint, tone = "accent" }) {
  const toneMap = {
    accent: "text-accent bg-accent/10",
    ok:     "text-ok bg-ok/10",
    warn:   "text-warn bg-warn/10",
    err:    "text-err bg-err/10",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg ${toneMap[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">{title}</div>
          <div className="mt-1 text-2xs leading-relaxed text-ink-mute">{hint}</div>
        </div>
      </div>
    </Card>
  );
}