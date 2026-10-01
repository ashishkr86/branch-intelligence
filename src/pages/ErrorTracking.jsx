import { useState } from "react";
import {
  AlertTriangle, RefreshCw, CheckCircle2, XCircle, Info,
  Trash2, ShieldAlert,
} from "lucide-react";
import { Card, Badge, KpiTile } from "../components/ui/primitives";
import { SkeletonGrid, SkeletonTable } from "../components/ui/Skeleton";
import { ErrorPanel } from "../components/ui/ErrorPanel";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

const LEVEL_COLORS = {
  CRITICAL: { variant: "err", icon: XCircle },
  ERROR: { variant: "err", icon: XCircle },
  WARNING: { variant: "warn", icon: AlertTriangle },
  INFO: { variant: "accent", icon: Info },
};

export default function ErrorTracking() {
  const [hours, setHours] = useState(24);
  const [level, setLevel] = useState("all");

  const stats = useApi(() => api.errorStats(hours), [hours]);
  const list = useApi(() => api.errors(level !== "all" ? { level } : {}), [level]);

  if (stats.error) return <ErrorPanel message={stats.error} onRetry={stats.refetch} />;

  const handleResolve = async (id) => {
    await api.resolveError(id);
    list.refetch();
  };

  const handleResolveAll = async () => {
    if (window.confirm("Mark all errors as resolved?")) {
      await api.resolveAllErrors();
      list.refetch();
      stats.refetch();
    }
  };

  const handleClear = async () => {
    if (window.confirm("Permanently delete all error logs?")) {
      await api.clearErrors();
      list.refetch();
      stats.refetch();
    }
  };

  const handleTest = async () => {
    await api.testError();
    list.refetch();
    stats.refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="accent"><ShieldAlert className="h-3 w-3" /> Observability</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Error Tracking</h2>
          <p className="mt-1 text-sm text-ink-soft">Live errors from API, ETL and system</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs text-ink-soft outline-none focus:border-accent"
          >
            <option value={1}>Last hour</option>
            <option value={24}>Last 24h</option>
            <option value={168}>Last 7d</option>
            <option value={720}>Last 30d</option>
          </select>
          <button
            onClick={() => { stats.refetch(); list.refetch(); }}
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={handleTest}
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
          >
            Log Test Error
          </button>
          <button
            onClick={handleClear}
            className="focus-ring inline-flex items-center gap-2 rounded-lg bg-err px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear All
          </button>
        </div>
      </div>

      {stats.loading ? (
        <SkeletonGrid count={4} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile label="Total Errors" value={stats.data.total.toLocaleString()} delta={`Last ${hours}h`} deltaTone="soft" icon={AlertTriangle} />
            <KpiTile label="Critical" value={(stats.data.byLevel.CRITICAL || 0).toLocaleString()} delta="Needs attention" deltaTone={(stats.data.byLevel.CRITICAL || 0) > 0 ? "err" : "ok"} icon={XCircle} />
            <KpiTile label="Errors" value={(stats.data.byLevel.ERROR || 0).toLocaleString()} delta="Server-side" deltaTone="soft" icon={XCircle} />
            <KpiTile label="Warnings" value={(stats.data.byLevel.WARNING || 0).toLocaleString()} delta="Non-critical" deltaTone="soft" icon={AlertTriangle} />
          </div>

          {stats.data.topGroups.length > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-line px-6 py-5">
                <h3 className="text-md font-semibold text-ink">Top Recurring Errors</h3>
                <p className="mt-0.5 text-xs text-ink-soft">Grouped by fingerprint</p>
              </div>
              <div className="divide-y divide-line">
                {stats.data.topGroups.map((g, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-3.5">
                    <div className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-err/15 text-2xs font-bold text-err">{g.count}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-ink">{g.message}</div>
                      <div className="mt-0.5 text-2xs text-ink-mute">
                        {g.source} · last seen {new Date(g.lastSeen).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-line px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-md font-semibold text-ink">Recent Errors</h3>
            <p className="mt-0.5 text-xs text-ink-soft">Live from MySQL</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="rounded-lg border border-line bg-bg px-3 py-2 text-xs text-ink-soft outline-none focus:border-accent"
            >
              <option value="all">All levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="ERROR">Error</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
            <button
              onClick={handleResolveAll}
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ok transition hover:border-ok/40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Resolve All
            </button>
          </div>
        </div>

        {list.loading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : list.data.errors.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ok/10 text-ok">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-ink">All clear</p>
            <p className="mt-1 text-xs text-ink-soft">No errors in this time range</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-subtle/50">
                <tr>
                  {["Level", "Source", "Message", "Endpoint", "Time", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.data.errors.map((e) => {
                  const cfg = LEVEL_COLORS[e.level] || LEVEL_COLORS.INFO;
                  const Icon = cfg.icon;
                  return (
                    <tr key={e.id} className={`hover:bg-bg-hover/40 ${e.resolved ? "opacity-50" : ""}`}>
                      <td className="whitespace-nowrap px-5 py-3"><Badge variant={cfg.variant}><Icon className="h-3 w-3" /> {e.level}</Badge></td>
                      <td className="mono-num whitespace-nowrap px-5 py-3 text-xs text-ink-soft">{e.source}</td>
                      <td className="max-w-md truncate px-5 py-3 text-ink-soft">{e.message}</td>
                      <td className="mono-num whitespace-nowrap px-5 py-3 text-2xs text-ink-mute">{e.method ? `${e.method} ` : ""}{e.endpoint || "—"}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-ink-mute">{new Date(e.createdAt).toLocaleString()}</td>
                      <td className="whitespace-nowrap px-5 py-3">
                        {!e.resolved && (
                          <button onClick={() => handleResolve(e.id)} className="text-xs font-semibold text-accent hover:underline">
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}