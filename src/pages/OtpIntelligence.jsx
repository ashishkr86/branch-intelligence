import { KeyRound, RefreshCw } from "lucide-react";
import LineChart from "../components/charts/LineChart";
import DonutChart from "../components/charts/DonutChart";
import BarChart from "../components/charts/BarChart";
import { Card, SectionHeader, KpiTile, Badge } from "../components/ui/primitives";
import { SkeletonGrid, SkeletonChart, SkeletonTable } from "../components/ui/Skeleton";
import { ErrorPanel } from "../components/ui/ErrorPanel";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

export default function OtpIntelligence() {
  const summary = useApi(() => api.otpSummary());
  const records = useApi(() => api.otp({ limit: 50 }));

  if (summary.error) return <ErrorPanel message={summary.error} onRetry={summary.refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Badge variant="accent"><KeyRound className="h-3 w-3" /> Operational Analytics</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">OTP Intelligence</h2>
          <p className="mt-1 text-sm text-ink-soft">Live from MySQL · {summary.data?.kpis.total.toLocaleString() || "…"} total records</p>
        </div>
        <button
          onClick={() => { summary.refetch(); records.refetch(); }}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {summary.loading ? (
        <>
          <SkeletonGrid count={4} />
          <SkeletonChart height={280} />
          <div className="grid gap-6 xl:grid-cols-2">
            <SkeletonChart height={280} />
            <SkeletonChart height={280} />
          </div>
          <SkeletonTable rows={8} cols={7} />
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile label="Total OTP" value={summary.data.kpis.total.toLocaleString()} delta="All-time" deltaTone="soft" icon={KeyRound} />
            <KpiTile label="Today" value={summary.data.kpis.today.toLocaleString()} delta="CURDATE()" deltaTone="soft" icon={KeyRound} />
            <KpiTile label="Unique Operators" value={summary.data.kpis.uniqueOperators} delta="Distinct" deltaTone="soft" icon={KeyRound} />
            <KpiTile label="Avg per Branch" value={summary.data.kpis.avgPerBranch} delta="Mean" deltaTone="soft" icon={KeyRound} />
          </div>

          <Card className="p-6">
            <SectionHeader title="OTP Trend" description="Last 20 days" action={<Badge variant="accent">Live</Badge>} />
            <LineChart labels={summary.data.trend.labels} data={summary.data.trend.data} label="OTP Count" color="#06b6d4" height={280} />
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="p-6">
              <SectionHeader title="Purpose Analysis" description="By purpose type" />
              <DonutChart labels={summary.data.byPurpose.labels} data={summary.data.byPurpose.data} colors={summary.data.byPurpose.colors} height={280} />
            </Card>

            <Card className="p-6">
              <SectionHeader title="Hourly Activity" description="Distribution by hour of day" />
              <BarChart labels={summary.data.byHour.labels} data={summary.data.byHour.data} color="#8b5cf6" height={280} />
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div>
                <h3 className="text-md font-semibold text-ink">Recent OTP Records</h3>
                <p className="mt-0.5 text-xs text-ink-soft">Latest 50 from MySQL</p>
              </div>
            </div>
            {records.loading ? (
              <SkeletonTable rows={8} cols={7} />
            ) : records.error ? (
              <div className="p-6"><ErrorPanel message={records.error} onRetry={records.refetch} /></div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-subtle/50">
                    <tr>
                      {["BM Code", "Branch", "Purpose", "Operator", "Date", "Time", "Mobile"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {records.data.records.map((r) => (
                      <tr key={r.id} className="hover:bg-bg-hover/40">
                        <td className="mono-num whitespace-nowrap px-6 py-3.5 text-accent">{r.bm}</td>
                        <td className="whitespace-nowrap px-6 py-3.5 text-ink">{r.branch}</td>
                        <td className="whitespace-nowrap px-6 py-3.5 text-xs text-ink-soft">{r.purpose}</td>
                        <td className="whitespace-nowrap px-6 py-3.5 text-ink-soft">{r.operator}</td>
                        <td className="mono-num whitespace-nowrap px-6 py-3.5 text-xs text-ink-soft">{r.date}</td>
                        <td className="mono-num whitespace-nowrap px-6 py-3.5 text-xs text-ink-soft">{r.time}</td>
                        <td className="mono-num whitespace-nowrap px-6 py-3.5 text-xs text-ink-mute">{r.mobile}</td>
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