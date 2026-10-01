import { useState } from "react";
import {
  Users, Search, RefreshCw, ArrowLeft, KeyRound, Building2,
  Calendar, Target, TrendingUp,
} from "lucide-react";
import LineChart from "../components/charts/LineChart";
import DonutChart from "../components/charts/DonutChart";
import BarChart from "../components/charts/BarChart";
import { Card, SectionHeader, Badge, KpiTile, StatusDot } from "../components/ui/primitives";
import { SkeletonGrid, SkeletonChart, SkeletonTable } from "../components/ui/Skeleton";
import { ErrorPanel } from "../components/ui/ErrorPanel";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

export default function OperatorDetail() {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [selected, setSelected] = useState(null);

  const params = {};
  if (search) params.search = search;
  if (region !== "all") params.region = region;

  const list = useApi(() => api.operators(params), [search, region]);

  if (list.error) return <ErrorPanel message={list.error} onRetry={list.refetch} />;

  /* ───────── DETAIL VIEW ───────── */
  if (selected) {
    return <OperatorView operatorName={selected} onBack={() => setSelected(null)} />;
  }

  /* ───────── LIST VIEW ───────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="accent">
            <Users className="h-3 w-3" /> Operator Analytics
          </Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            Operators
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Every operator who generates OTPs — click a row for details
          </p>
        </div>
        <button
          onClick={list.refetch}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {list.loading ? (
        <>
          <SkeletonGrid count={4} />
          <SkeletonTable rows={10} cols={7} />
        </>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Total Operators"
              value={list.data.summary.totalOperators.toLocaleString()}
              delta="Distinct operators"
              deltaTone="soft"
              icon={Users}
            />
            <KpiTile
              label="Total OTPs"
              value={list.data.summary.totalOtp.toLocaleString()}
              delta="Across all operators"
              deltaTone="soft"
              icon={KeyRound}
            />
            <KpiTile
              label="Avg per Operator"
              value={list.data.summary.avgOtpPerOperator.toLocaleString()}
              delta="OTPs per operator"
              deltaTone="soft"
              icon={TrendingUp}
            />
            <KpiTile
              label="Top Operator"
              value={list.data.summary.topOperator}
              delta={`${list.data.summary.topOperatorOtp.toLocaleString()} OTPs`}
              deltaTone="ok"
              icon={Target}
            />
          </div>

          {/* Filters + Table */}
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-line px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-md font-semibold text-ink">All Operators</h3>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {list.data.total} operators shown
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-mute" />
                  <input
                    type="text"
                    placeholder="Search operator…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-56 rounded-lg border border-line bg-bg py-2 pl-9 pr-3 text-xs text-ink placeholder-ink-mute outline-none focus:border-accent"
                  />
                </div>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="rounded-lg border border-line bg-bg px-3 py-2 text-xs text-ink-soft outline-none focus:border-accent"
                >
                  <option value="all">All Regions</option>
                  {list.data.filterOptions.regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-subtle/50">
                  <tr>
                    {["#", "Operator", "OTP Count", "Branches", "Purposes", "Avg / Branch", "Last Active"].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.data.operators.map((op, i) => (
                    <tr
                      key={op.operator}
                      onClick={() => setSelected(op.operator)}
                      className="cursor-pointer hover:bg-bg-hover/40"
                    >
                      <td className="mono-num whitespace-nowrap px-5 py-3 text-ink-mute">#{i + 1}</td>
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-accent">
                        {op.operator}
                      </td>
                      <td className="mono-num whitespace-nowrap px-5 py-3 font-semibold text-ink">
                        {op.otp.toLocaleString()}
                      </td>
                      <td className="mono-num whitespace-nowrap px-5 py-3 text-ink-soft">
                        {op.branches}
                      </td>
                      <td className="mono-num whitespace-nowrap px-5 py-3 text-ink-soft">
                        {op.purposes}
                      </td>
                      <td className="mono-num whitespace-nowrap px-5 py-3 text-ink-soft">
                        {op.avgPerBranch}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-ink-mute">
                        {op.lastActivity}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line-strong bg-bg-subtle/70">
                    <td className="whitespace-nowrap px-5 py-3.5 text-2xs font-bold uppercase tracking-wider text-ink-soft">
                      Total
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-sm font-bold text-ink">
                      {list.data.total} operators
                    </td>
                    <td className="mono-num whitespace-nowrap px-5 py-3.5 text-sm font-bold text-accent">
                      {list.data.summary.totalOtp.toLocaleString()}
                    </td>
                    <td className="mono-num whitespace-nowrap px-5 py-3.5 text-sm font-bold text-ink">
                      {list.data.operators.reduce((s, o) => s + o.branches, 0).toLocaleString()}
                    </td>
                    <td className="mono-num whitespace-nowrap px-5 py-3.5 text-sm font-bold text-ink">
                      {list.data.operators.reduce((s, o) => s + o.purposes, 0).toLocaleString()}
                    </td>
                    <td className="mono-num whitespace-nowrap px-5 py-3.5 text-sm font-bold text-ink">
                      {list.data.summary.avgOtpPerOperator}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-ink-mute">
                      —
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* OPERATOR DETAIL VIEW                                            */
/* ═══════════════════════════════════════════════════════════════ */

function OperatorView({ operatorName, onBack }) {
  const detail = useApi(() => api.operatorDetail(operatorName), [operatorName]);
  const records = useApi(() => api.operatorRecords(operatorName, 50), [operatorName]);

  if (detail.error) return <ErrorPanel message={detail.error} onRetry={detail.refetch} />;

  return (
    <div className="space-y-6">
      {/* Header with back */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-accent"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to all operators
          </button>
          <Badge variant="accent">
            <Users className="h-3 w-3" /> Operator
          </Badge>
          <h2 className="mono-num mt-3 text-2xl font-semibold tracking-tight text-ink">
            {operatorName}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Complete OTP activity breakdown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status="ok" pulse label="Live" />
          <button
            onClick={() => {
              detail.refetch();
              records.refetch();
            }}
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {detail.loading ? (
        <>
          <SkeletonGrid count={4} />
          <SkeletonChart />
        </>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Total OTPs"
              value={detail.data.stats.otp.toLocaleString()}
              delta="All-time"
              deltaTone="ok"
              icon={KeyRound}
            />
            <KpiTile
              label="Branches Covered"
              value={detail.data.stats.branches.toLocaleString()}
              delta={`Avg ${detail.data.stats.avgPerBranch}/branch`}
              deltaTone="soft"
              icon={Building2}
            />
            <KpiTile
              label="Active Days"
              value={detail.data.stats.activeDays.toLocaleString()}
              delta="Distinct dates"
              deltaTone="soft"
              icon={Calendar}
            />
            <KpiTile
              label="Purposes Used"
              value={detail.data.stats.purposes.toLocaleString()}
              delta="Distinct purposes"
              deltaTone="soft"
              icon={Target}
            />
          </div>

          {/* Timeline */}
          <Card className="p-5">
            <SectionHeader title="Activity Timeline" description="First and last activity" />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-line bg-bg-hover/30 p-4">
                <div className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">
                  First Activity
                </div>
                <div className="mono-num mt-1 text-md font-semibold text-ink">
                  {detail.data.stats.firstActivity}
                </div>
              </div>
              <div className="rounded-lg border border-line bg-bg-hover/30 p-4">
                <div className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">
                  Last Activity
                </div>
                <div className="mono-num mt-1 text-md font-semibold text-ink">
                  {detail.data.stats.lastActivity}
                </div>
              </div>
            </div>
          </Card>

          {/* Charts Row */}
          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="p-6 xl:col-span-2">
              <SectionHeader title="Daily Trend (30 days)" description="OTPs per day" />
              <LineChart
                labels={detail.data.trend.labels}
                data={detail.data.trend.data}
                color="#06b6d4"
                height={240}
              />
            </Card>

            <Card className="p-6">
              <SectionHeader title="By Purpose" description="Distribution" />
              <DonutChart
                labels={detail.data.byPurpose.labels}
                data={detail.data.byPurpose.data}
                colors={detail.data.byPurpose.colors}
                height={240}
              />
            </Card>
          </div>

          {/* Branches Bar */}
          <Card className="p-6">
            <SectionHeader
              title="OTPs by Branch"
              description={`Top ${detail.data.byBranch.length} branches`}
            />
            <BarChart
              labels={detail.data.byBranch.map((b) => b.bm)}
              data={detail.data.byBranch.map((b) => b.otp)}
              color="#10b981"
              height={240}
            />
          </Card>

          {/* Branch Table */}
          <Card className="overflow-hidden">
            <div className="border-b border-line px-6 py-5">
              <h3 className="text-md font-semibold text-ink">Branches Worked</h3>
              <p className="mt-0.5 text-xs text-ink-soft">
                {detail.data.byBranch.length} branches
              </p>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-subtle/50">
                  <tr>
                    {["BM Code", "Branch Name", "Region", "OTP Count"].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {detail.data.byBranch.map((b) => (
                    <tr key={b.bm} className="hover:bg-bg-hover/40">
                      <td className="mono-num whitespace-nowrap px-6 py-3.5 text-accent">
                        {b.bm}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-ink">{b.name}</td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-ink-soft">
                        {b.region}
                      </td>
                      <td className="mono-num whitespace-nowrap px-6 py-3.5 font-semibold text-ink">
                        {b.otp.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line-strong bg-bg-subtle/70">
                    <td colSpan={3} className="whitespace-nowrap px-6 py-3.5 text-2xs font-bold uppercase tracking-wider text-ink-soft">
                      Total
                    </td>
                    <td className="mono-num whitespace-nowrap px-6 py-3.5 text-sm font-bold text-accent">
                      {detail.data.byBranch
                        .reduce((s, b) => s + b.otp, 0)
                        .toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Recent Records */}
          {records.loading ? (
            <SkeletonTable rows={8} cols={6} />
          ) : (
            <Card className="overflow-hidden">
              <div className="border-b border-line px-6 py-5">
                <h3 className="text-md font-semibold text-ink">Recent OTP Records</h3>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Latest 50 OTPs from this operator
                </p>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-subtle/50">
                    <tr>
                      {["BM Code", "Branch", "Purpose", "Date", "Time", "Mobile"].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {records.data.records.map((r) => (
                      <tr key={r.id} className="hover:bg-bg-hover/40">
                        <td className="mono-num whitespace-nowrap px-6 py-3.5 text-accent">
                          {r.bm}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3.5 text-ink">{r.branch}</td>
                        <td className="whitespace-nowrap px-6 py-3.5 text-xs text-ink-soft">
                          {r.purpose}
                        </td>
                        <td className="mono-num whitespace-nowrap px-6 py-3.5 text-xs text-ink-soft">
                          {r.date}
                        </td>
                        <td className="mono-num whitespace-nowrap px-6 py-3.5 text-xs text-ink-soft">
                          {r.time}
                        </td>
                        <td className="mono-num whitespace-nowrap px-6 py-3.5 text-xs text-ink-mute">
                          {r.mobile}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-line-strong bg-bg-subtle/70">
                      <td colSpan={5} className="whitespace-nowrap px-6 py-3.5 text-2xs font-bold uppercase tracking-wider text-ink-soft">
                        Total Records Shown
                      </td>
                      <td className="mono-num whitespace-nowrap px-6 py-3.5 text-sm font-bold text-accent">
                        {records.data.records.length.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}