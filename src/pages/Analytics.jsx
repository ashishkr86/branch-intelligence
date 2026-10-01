import { useState } from "react";
import {
  BarChart3, RefreshCw, Download, Users, AlertCircle, Zap, CalendarCheck,
} from "lucide-react";
import { Card, KpiTile, Badge } from "../components/ui/primitives";
import { SkeletonGrid, SkeletonTable } from "../components/ui/Skeleton";
import { ErrorPanel } from "../components/ui/ErrorPanel";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

export default function Analytics() {
  const [limit, setLimit] = useState(10);
  const { data, loading, error, refetch } = useApi(
    () => api.analytics({ limit }),
    [limit]
  );

  if (error) return <ErrorPanel message={error} onRetry={refetch} />;

  // Best branch by average OTP per day
  const bestAvg = data
    ? [...data.otpPerBranch].sort((a, b) => Number(b.avgPerDay) - Number(a.avgPerDay))[0]
    : null;
  const longestActive = data
    ? Math.max(...data.otpPerBranch.map((b) => Number(b.activeDays) || 0), 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="accent"><BarChart3 className="h-3 w-3" /> Business Intelligence</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Analytics</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Operator performance and exceptions — live from MySQL
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs text-ink-soft outline-none focus:border-accent"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
          </select>
          <button
            onClick={refetch}
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button className="focus-ring inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-bg hover:brightness-110">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {loading ? (
        <>
          <SkeletonGrid count={3} />
          <SkeletonTable rows={6} cols={4} />
          <SkeletonTable rows={6} cols={5} />
        </>
      ) : (
        <>
          {/* ─── KPI Grid ─── */}
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiTile
              label="Best Avg / Day"
              value={bestAvg ? bestAvg.avgPerDay : "0"}
              delta={bestAvg?.name || "—"}
              deltaTone="ok"
              icon={Zap}
            />
            <KpiTile
              label="Longest Active"
              value={longestActive}
              delta="Days with OTP (one branch)"
              deltaTone="soft"
              icon={CalendarCheck}
            />
            <KpiTile
              label="Branches w/o OTP"
              value={data.branchesWithoutOtp.length}
              delta="No activity"
              deltaTone="warn"
              icon={AlertCircle}
            />
          </div>

          {/* ─── Operator Summary Table ─── */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-md font-semibold text-ink">Operator Summary</h3>
                  <p className="mt-0.5 text-xs text-ink-soft">Ranked by OTP volume</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-subtle/50">
                  <tr>
                    {["Rank", "Operator", "OTP Count", "Branches Covered"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.operators.map((op, i) => (
                    <tr key={op.name} className="hover:bg-bg-hover/40">
                      <td className="mono-num whitespace-nowrap px-6 py-3.5 text-ink-mute">#{i + 1}</td>
                      <td className="whitespace-nowrap px-6 py-3.5 font-medium text-ink">{op.name}</td>
                      <td className="mono-num whitespace-nowrap px-6 py-3.5 font-semibold text-accent">
                        {op.otp.toLocaleString()}
                      </td>
                      <td className="mono-num whitespace-nowrap px-6 py-3.5 text-ink-soft">{op.branches}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ─── OTP Per Branch Table ─── */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div>
                <h3 className="text-md font-semibold text-ink">OTP per Active Branch</h3>
                <p className="mt-0.5 text-xs text-ink-soft">Volume and daily average</p>
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-subtle/50">
                  <tr>
                    {["BM Code", "Branch", "OTP Count", "Active Days", "Avg / Day"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.otpPerBranch.map((b) => (
                    <tr key={b.bm} className="hover:bg-bg-hover/40">
                      <td className="mono-num whitespace-nowrap px-6 py-3.5 text-accent">{b.bm}</td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-ink">{b.name}</td>
                      <td className="mono-num whitespace-nowrap px-6 py-3.5 font-semibold text-ink">
                        {b.otp.toLocaleString()}
                      </td>
                      <td className="mono-num whitespace-nowrap px-6 py-3.5 text-ink-soft">{b.activeDays}</td>
                      <td className="mono-num whitespace-nowrap px-6 py-3.5 text-ink-soft">{b.avgPerDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ─── Branches w/o OTP ─── */}
          {data.branchesWithoutOtp.length > 0 && (
            <Card className="overflow-hidden border-warn/30">
              <div className="flex items-center justify-between border-b border-line bg-warn/5 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-warn/15 text-warn">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-md font-semibold text-ink">Branches Without OTP Activity</h3>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {data.branchesWithoutOtp.length} branches have no OTP records
                    </p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-subtle/50">
                    <tr>
                      {["BM Code", "Branch Name", "Region"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.branchesWithoutOtp.map((b) => (
                      <tr key={b.bm} className="hover:bg-bg-hover/40">
                        <td className="mono-num whitespace-nowrap px-6 py-3.5 text-accent">{b.bm}</td>
                        <td className="whitespace-nowrap px-6 py-3.5 text-ink">{b.name}</td>
                        <td className="whitespace-nowrap px-6 py-3.5 text-ink-soft">{b.region}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}