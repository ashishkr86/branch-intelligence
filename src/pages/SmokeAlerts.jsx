import { useState } from "react";
import {
  Flame, AlertTriangle, RefreshCw, CheckCircle2, Activity,
} from "lucide-react";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import { Card, SectionHeader, KpiTile, Badge } from "../components/ui/primitives";
import { SkeletonGrid, SkeletonChart, SkeletonTable } from "../components/ui/Skeleton";
import { ErrorPanel } from "../components/ui/ErrorPanel";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

const SEVERITY_VARIANTS = {
  LOW: "ok",
  MEDIUM: "warn",
  HIGH: "err",
  CRITICAL: "err",
};

const STATUS_VARIANTS = {
  OPEN: "err",
  RESOLVED: "ok",
  FALSE_ALARM: "neutral",
};

export default function SmokeAlerts() {
  const [days, setDays] = useState(30);
  const { data, loading, error, refetch } = useApi(
    () => api.smokeAlerts({ days }),
    [days]
  );

  if (error) return <ErrorPanel message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="warn">
            <Flame className="h-3 w-3" /> Fire Safety
          </Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            Smoke Alerts
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Smoke + Ceiling smoke sensor events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs text-ink-soft outline-none focus:border-accent"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={refetch}
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <>
          <SkeletonGrid count={4} />
          <div className="grid gap-6 xl:grid-cols-2">
            <SkeletonChart />
            <SkeletonChart />
          </div>
          <SkeletonTable rows={8} cols={7} />
        </>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Total Alerts"
              value={data.kpis.total.toLocaleString()}
              delta={`Last ${days} days`}
              deltaTone="soft"
              icon={AlertTriangle}
            />
            <KpiTile
              label="Smoke Sensors"
              value={data.kpis.smoke.toLocaleString()}
              delta="Standard sensors"
              deltaTone="warn"
              icon={Flame}
            />
            <KpiTile
              label="Ceiling Sensors"
              value={data.kpis.ceilingSmoke.toLocaleString()}
              delta="Ceiling mounted"
              deltaTone="warn"
              icon={Activity}
            />
            <KpiTile
              label="High Severity"
              value={data.kpis.highSeverity.toLocaleString()}
              delta="HIGH or CRITICAL"
              deltaTone={data.kpis.highSeverity > 0 ? "err" : "ok"}
              icon={AlertTriangle}
            />
          </div>

          {/* Charts */}
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="p-6">
              <SectionHeader title="Alert Trend" description="Daily alerts over time" />
              <LineChart
                labels={data.trend.labels}
                data={data.trend.data}
                color="#f59e0b"
                height={260}
              />
            </Card>
            <Card className="p-6">
              <SectionHeader title="By Severity" description="Distribution by severity" />
              <BarChart
                labels={data.bySeverity.labels}
                data={data.bySeverity.data}
                color="#ef4444"
                height={260}
              />
            </Card>
          </div>

          {/* Records Table */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div>
                <h3 className="text-md font-semibold text-ink">Alert Records</h3>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {data.records.length} records
                </p>
              </div>
            </div>
            {data.records.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ok/10 text-ok">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-medium text-ink">No smoke alerts</p>
                <p className="mt-1 text-xs text-ink-soft">All clear in this time range</p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-subtle/50">
                    <tr>
                      {["BM Code", "Branch", "Region", "Sensor Type", "Sensor ID", "Severity", "Date", "Time", "Status"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.records.map((r) => (
                      <tr key={r.id} className="hover:bg-bg-hover/40">
                        <td className="mono-num whitespace-nowrap px-5 py-3 text-accent">{r.bm}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-ink">{r.branch || "—"}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-ink-soft">{r.region || "—"}</td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <Badge variant={r.sensorType === "CEILING_SMOKE" ? "accent" : "warn"}>
                            {r.sensorType}
                          </Badge>
                        </td>
                        <td className="mono-num whitespace-nowrap px-5 py-3 text-ink-soft">{r.sensorId}</td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <Badge variant={SEVERITY_VARIANTS[r.severity] || "neutral"}>{r.severity}</Badge>
                        </td>
                        <td className="mono-num whitespace-nowrap px-5 py-3 text-ink-soft text-xs">{r.date}</td>
                        <td className="mono-num whitespace-nowrap px-5 py-3 text-ink-soft text-xs">{r.time}</td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <Badge variant={STATUS_VARIANTS[r.status] || "neutral"}>{r.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}