import {
  ShieldCheck, AlertTriangle, XCircle, CheckCircle2, RefreshCw, Database,
} from "lucide-react";
import { Card, SectionHeader, Badge, ProgressBar } from "../components/ui/primitives";
import { SkeletonChart, SkeletonTable } from "../components/ui/Skeleton";
import { ErrorPanel } from "../components/ui/ErrorPanel";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

const STATUS_BADGE = {
  pass: { variant: "ok", label: "PASS", icon: CheckCircle2 },
  warn: { variant: "warn", label: "WARNING", icon: AlertTriangle },
  fail: { variant: "err", label: "FAIL", icon: XCircle },
};

export default function DataQuality() {
  const { data, loading, error, refetch } = useApi(() => api.quality());

  if (error) return <ErrorPanel message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Badge variant="accent"><ShieldCheck className="h-3 w-3" /> Quality Control</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Data Quality</h2>
          <p className="mt-1 text-sm text-ink-soft">Live validations from MySQL</p>
        </div>
        <button
          onClick={refetch}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <SkeletonChart height={200} />
            <div className="lg:col-span-2"><SkeletonChart /></div>
          </div>
          <SkeletonTable rows={8} cols={5} />
        </>
      ) : (
        <>
          {/* Score */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="relative overflow-hidden p-6">
              <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-widest text-ink-mute">
                <ShieldCheck className="h-3 w-3" /> Quality Score
              </div>
              <div className="mt-4 flex items-end gap-3">
                <div className={`mono-num text-5xl font-bold ${
                  data.score.score >= 90 ? "text-ok" : data.score.score >= 70 ? "text-warn" : "text-err"
                }`}>
                  {data.score.score}%
                </div>
              </div>
              <div className="mt-5">
                <ProgressBar
                  value={data.score.score}
                  tone={data.score.score >= 90 ? "ok" : data.score.score >= 70 ? "warn" : "err"}
                  size="md"
                />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <SmallStat label="Passed" value={data.score.passed} tone="text-ok" />
                <SmallStat label="Warnings" value={data.score.warnings} tone="text-warn" />
                <SmallStat label="Failed" value={data.score.failed} tone="text-err" />
              </div>
            </Card>

            <Card className="p-6 lg:col-span-2">
              <SectionHeader
                title="Live Quality Checks"
                description={`${data.score.totalChecks} rules evaluated against MySQL`}
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {data.metrics.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg-hover/30 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-ink">{m.label}</div>
                      <div className="mt-0.5 text-2xs text-ink-mute">threshold: {m.threshold}</div>
                    </div>
                    <div className="text-right">
                      <div className={`mono-num text-sm font-semibold ${
                        m.status === "pass" ? "text-ok" : m.status === "warn" ? "text-warn" : "text-err"
                      }`}>
                        {m.value.toLocaleString()}
                      </div>
                      <StatusPill status={m.status} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* By Table */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div>
                <h3 className="flex items-center gap-2 text-md font-semibold text-ink">
                  <Database className="h-4 w-4 text-accent" /> Quality by Table
                </h3>
                <p className="mt-0.5 text-xs text-ink-soft">Row-level quality across MySQL tables</p>
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-subtle/50">
                  <tr>
                    {["Table", "Rows", "Valid", "Invalid", "Nulls", "Score", "Status"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.tables.map((t) => (
                    <tr key={t.table} className="hover:bg-bg-hover/40">
                      <td className="mono-num whitespace-nowrap px-6 py-4 text-ink font-medium">{t.table}</td>
                      <td className="mono-num whitespace-nowrap px-6 py-4 text-ink-soft">{t.rows.toLocaleString()}</td>
                      <td className="mono-num whitespace-nowrap px-6 py-4 text-ok">{t.valid.toLocaleString()}</td>
                      <td className="mono-num whitespace-nowrap px-6 py-4 text-warn">{t.invalid.toLocaleString()}</td>
                      <td className="mono-num whitespace-nowrap px-6 py-4 text-warn">{t.nulls.toLocaleString()}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="mono-num text-ink font-semibold">{t.score}%</span>
                          <div className="w-20">
                            <ProgressBar value={t.score} tone={t.status === "pass" ? "ok" : "warn"} size="sm" />
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusPill status={t.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Column-level */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div>
                <h3 className="text-md font-semibold text-ink">Column-Level Quality</h3>
                <p className="mt-0.5 text-xs text-ink-soft">Per-column nulls and validation</p>
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-subtle/50">
                  <tr>
                    {["Column", "Table", "Total", "Nulls", "Valid", "Invalid", "Status"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.columns.map((c, i) => (
                    <tr key={i} className="hover:bg-bg-hover/40">
                      <td className="mono-num whitespace-nowrap px-6 py-4 text-ink font-medium">{c.column}</td>
                      <td className="mono-num whitespace-nowrap px-6 py-4 text-ink-soft text-xs">{c.table}</td>
                      <td className="mono-num whitespace-nowrap px-6 py-4 text-ink-soft">{c.total.toLocaleString()}</td>
                      <td className="mono-num whitespace-nowrap px-6 py-4 text-ink-soft">
                        {c.nulls > 0 ? <span className="text-warn">{c.nulls.toLocaleString()}</span> : "0"}
                      </td>
                      <td className="mono-num whitespace-nowrap px-6 py-4 text-ok">{c.valid.toLocaleString()}</td>
                      <td className="mono-num whitespace-nowrap px-6 py-4">
                        {c.invalid > 0 ? <span className="text-warn">{c.invalid.toLocaleString()}</span> : "0"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusPill status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const cfg = STATUS_BADGE[status];
  const Icon = cfg.icon;
  return <Badge variant={cfg.variant}><Icon className="h-3 w-3" /> {cfg.label}</Badge>;
}

function SmallStat({ label, value, tone }) {
  return (
    <div className="rounded-lg bg-bg-hover/40 p-3 text-center">
      <div className={`mono-num text-lg font-bold ${tone}`}>{value}</div>
      <div className="mt-0.5 text-2xs text-ink-mute">{label}</div>
    </div>
  );
}