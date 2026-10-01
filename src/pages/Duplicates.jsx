import { useState } from "react";
import {
  Layers, RefreshCw, Trash2, CheckCircle2, AlertTriangle,
  Database, Loader2,
} from "lucide-react";
import { Card, Badge, KpiTile } from "../components/ui/primitives";
import { SkeletonGrid, SkeletonTable } from "../components/ui/Skeleton";
import { ErrorPanel } from "../components/ui/ErrorPanel";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

const TABLE_LABELS = {
  branch: "Branch",
  branch_employee: "Branch Employees",
  otp_report: "OTP Records",
  etl_runs: "ETL Runs",
};

export default function Duplicates() {
  const [expanded, setExpanded] = useState(null);
  const [cleaning, setCleaning] = useState(null);
  const [message, setMessage] = useState(null);

  const { data, loading, error, refetch } = useApi(() => api.duplicates());

  const handleClean = async (table) => {
    setCleaning(table);
    setMessage(null);
    try {
      const dry = await api.cleanDuplicates(table, true);
      if (dry.wouldDelete === 0) {
        setMessage({ type: "info", text: `No duplicates in ${TABLE_LABELS[table]}` });
      } else if (window.confirm(`Delete ${dry.wouldDelete} duplicate rows from ${TABLE_LABELS[table]}?`)) {
        const res = await api.cleanDuplicates(table, false);
        setMessage({ type: "success", text: `Deleted ${res.deleted} rows from ${TABLE_LABELS[table]}` });
        refetch();
      }
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setCleaning(null);
    }
  };

  if (error) return <ErrorPanel message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="accent"><Layers className="h-3 w-3" /> Data Quality</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Duplicate Detection</h2>
          <p className="mt-1 text-sm text-ink-soft">Find and clean duplicate rows across all tables</p>
        </div>
        <button
          onClick={refetch}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Rescan
        </button>
      </div>

      {message && (
        <Card className={`p-4 ${message.type === "success" ? "border-ok/30 bg-ok/5" : message.type === "error" ? "border-err/30 bg-err/5" : "border-accent/30 bg-accent/5"}`}>
          <div className="flex items-center gap-3 text-sm">
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4 text-ok" /> : <AlertTriangle className="h-4 w-4 text-ink-soft" />}
            <span className="text-ink-soft">{message.text}</span>
          </div>
        </Card>
      )}

      {loading ? (
        <>
          <SkeletonGrid count={3} />
          <SkeletonTable rows={4} cols={5} />
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiTile label="Tables Scanned" value={Object.keys(data.tables).length} delta="All tables" deltaTone="soft" icon={Database} />
            <KpiTile label="Clean Tables" value={data.summary.cleanTables} delta="No duplicates" deltaTone="ok" icon={CheckCircle2} />
            <KpiTile label="Total Duplicates" value={data.summary.totalDuplicates} delta={`${data.summary.dirtyTables} tables affected`} deltaTone={data.summary.totalDuplicates > 0 ? "warn" : "ok"} icon={AlertTriangle} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {Object.entries(data.tables).map(([tbl, t]) => (
              <Card key={tbl} className="overflow-hidden">
                <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-accent" />
                      <h3 className="mono-num text-md font-semibold text-ink">{tbl}</h3>
                      <Badge variant={t.duplicates === 0 ? "ok" : "warn"}>{t.duplicates === 0 ? "CLEAN" : "HAS DUPES"}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      Business key: <span className="mono-num text-ink-mute">{t.businessKey.join(", ")}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setExpanded(expanded === tbl ? null : tbl)}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    {expanded === tbl ? "Hide" : "Show"} sample
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3 px-5 py-4">
                  <div><div className="text-2xs uppercase tracking-wider text-ink-mute">Total</div><div className="mono-num mt-1 text-md font-semibold text-ink">{t.total.toLocaleString()}</div></div>
                  <div><div className="text-2xs uppercase tracking-wider text-ink-mute">Unique</div><div className="mono-num mt-1 text-md font-semibold text-ok">{t.unique.toLocaleString()}</div></div>
                  <div><div className="text-2xs uppercase tracking-wider text-ink-mute">Duplicates</div><div className={`mono-num mt-1 text-md font-semibold ${t.duplicates > 0 ? "text-warn" : "text-ink"}`}>{t.duplicates.toLocaleString()}</div></div>
                  <div><div className="text-2xs uppercase tracking-wider text-ink-mute">Dupe %</div><div className="mono-num mt-1 text-md font-semibold text-ink">{t.duplicatePct}%</div></div>
                </div>

                {expanded === tbl && t.sample.length > 0 && (
                  <div className="border-t border-line bg-bg-subtle/30 p-5">
                    <div className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">Sample Duplicates ({t.sample.length})</div>
                    <div className="mt-2 max-h-48 space-y-1 overflow-y-auto scrollbar-thin">
                      {t.sample.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 rounded bg-bg-elevated px-3 py-1.5 text-xs">
                          <span className="mono-num text-accent">
                            {Object.entries(s).filter(([k]) => k !== "_count").map(([, v]) => v).join(" · ")}
                          </span>
                          <span className="ml-auto text-warn">×{s._count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
                  <button
                    onClick={() => handleClean(tbl)}
                    disabled={t.duplicates === 0 || cleaning === tbl}
                    className="focus-ring inline-flex items-center gap-2 rounded-lg bg-err px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {cleaning === tbl ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cleaning…</> : <><Trash2 className="h-3.5 w-3.5" /> Clean</>}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}