import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { Card, SectionHeader, Badge, StatusDot } from "../components/ui/primitives";
import { SkeletonChart, SkeletonTable } from "../components/ui/Skeleton";
import { ErrorPanel } from "../components/ui/ErrorPanel";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

const STATUS_VARIANTS = { success: "ok", running: "accent", warning: "warn", failed: "err" };
const STATUS_ICONS = { success: CheckCircle2, warning: AlertTriangle, failed: XCircle, running: Clock };

export default function EtlPipeline() {
  const history = useApi(() => api.etlHistory());
  const status = useApi(() => api.etlStatus());

  if (history.error || status.error) {
    return <ErrorPanel message={history.error || status.error} onRetry={() => { history.refetch(); status.refetch(); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Badge variant="accent">Engineering Console</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">ETL Pipeline</h2>
          <p className="mt-1 text-sm text-ink-soft">Live ETL run history from MySQL</p>
        </div>
        <button
          onClick={() => { history.refetch(); status.refetch(); }}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {status.loading ? (
        <SkeletonChart height={140} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <div className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">Total Runs</div>
            <div className="mt-3 mono-num text-3xl font-semibold text-ink">{status.data.totalRuns}</div>
          </Card>
          <Card className="p-5">
            <div className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">Success Rate</div>
            <div className="mt-3 mono-num text-3xl font-semibold text-ok">{status.data.successRate}%</div>
          </Card>
          <Card className="p-5">
            <div className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">Last Run</div>
            <div className="mt-3 truncate text-md font-semibold text-ink">{status.data.lastRun?.file || "—"}</div>
            <div className="mt-1 text-xs text-ink-mute">{status.data.lastRun?.date || "—"}</div>
          </Card>
        </div>
      )}

      {history.loading ? (
        <SkeletonTable rows={6} cols={9} />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-6 py-5">
            <div>
              <h3 className="text-md font-semibold text-ink">ETL Run History</h3>
              <p className="mt-0.5 text-xs text-ink-soft">{history.data.total} runs from MySQL</p>
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-subtle/50">
                <tr>
                  {["Run ID", "Date", "File", "Started", "Duration", "Rows In", "Loaded", "Dropped", "Drop %", "Status"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.data.runs.map((run) => {
                  const Icon = STATUS_ICONS[run.status] || Clock;
                  return (
                    <tr key={run.id} className="hover:bg-bg-hover/40">
                      <td className="mono-num whitespace-nowrap px-5 py-3.5 text-ink">{run.id}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-ink-soft">{run.runDate}</td>
                      <td className="mono-num whitespace-nowrap px-5 py-3.5 text-ink-soft">{run.file}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-ink-soft">{run.startedAt}</td>
                      <td className="mono-num whitespace-nowrap px-5 py-3.5 text-ink-soft">{run.duration}</td>
                      <td className="mono-num whitespace-nowrap px-5 py-3.5 text-ink-soft">{run.rowsIn.toLocaleString()}</td>
                      <td className="mono-num whitespace-nowrap px-5 py-3.5 text-ok">{run.rowsLoaded.toLocaleString()}</td>
                      <td className="mono-num whitespace-nowrap px-5 py-3.5 text-warn">{run.rowsDropped.toLocaleString()}</td>
                      <td className="mono-num whitespace-nowrap px-5 py-3.5 text-ink-soft">{run.dropPct}%</td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <Badge variant={STATUS_VARIANTS[run.status] || "neutral"}>
                          <Icon className="h-3 w-3" /> {run.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}