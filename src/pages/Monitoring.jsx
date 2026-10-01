import { Activity, RefreshCw, Database, Server, AlertCircle, Rows3 } from "lucide-react";
import { Card, SectionHeader, Badge, StatusDot } from "../components/ui/primitives";
import { SkeletonGrid } from "../components/ui/Skeleton";
import { ErrorPanel } from "../components/ui/ErrorPanel";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

export default function Monitoring() {
  const monitoring = useApi(() => api.monitoring());

  if (monitoring.error) return <ErrorPanel message={monitoring.error} onRetry={monitoring.refetch} />;

  const tables = monitoring.data ? Object.entries(monitoring.data.tables) : [];
  const totalRows = tables.reduce((sum, [, count]) => sum + count, 0);
  const failures = monitoring.data ? monitoring.data.errors.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <Badge variant="accent"><Activity className="h-3 w-3" /> System Health</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Monitoring</h2>
          <p className="mt-1 text-sm text-ink-soft">Live system status and database size</p>
        </div>
        <button
          onClick={monitoring.refetch}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {monitoring.loading ? (
        <SkeletonGrid count={4} />
      ) : (
        <>
          {/* System Health Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SystemCard
              icon={Database}
              label="Database"
              value="Connected"
              status="ok"
              detail="gentech_db @ localhost:3306"
            />
            <SystemCard
              icon={Server}
              label="API"
              value="Running"
              status="ok"
              detail="FastAPI on :8000"
            />
            <SystemCard
              icon={Rows3}
              label="Total Rows"
              value={totalRows.toLocaleString()}
              status="ok"
              detail={`${tables.length} tables`}
            />
            <SystemCard
              icon={AlertCircle}
              label="Failed ETL Runs"
              value={failures}
              status={failures === 0 ? "ok" : "warn"}
              detail={failures === 0 ? "No failures" : "See ETL Pipeline for details"}
            />
          </div>

          {/* Table Row Counts */}
          <Card className="p-6">
            <SectionHeader
              title="Database Tables"
              description="Live row counts from MySQL"
              action={<StatusDot status="ok" pulse label="Live" />}
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {tables.map(([table, count]) => (
                <div key={table} className="rounded-xl border border-line bg-bg-hover/40 p-4">
                  <div className="mono-num text-2xs uppercase tracking-widest text-ink-mute">
                    {table}
                  </div>
                  <div className="mono-num mt-2 text-2xl font-semibold text-ink">
                    {count.toLocaleString()}
                  </div>
                  <div className="mt-1 text-2xs text-ink-mute">rows</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function SystemCard({ icon: Icon, label, value, status, detail }) {
  const statusColors = {
    ok: "text-ok",
    warn: "text-warn",
    err: "text-err",
  };
  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between">
        <div className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">
          {label}
        </div>
        <Icon className={`h-4 w-4 ${statusColors[status]}`} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <StatusDot status={status} pulse={status === "ok"} />
        <span className={`text-md font-semibold ${statusColors[status]}`}>{value}</span>
      </div>
      <div className="mt-2 text-xs text-ink-mute">{detail}</div>
    </Card>
  );
}