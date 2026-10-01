import { useState } from "react";
import { Building2, Search, TrendingUp, RefreshCw } from "lucide-react";
import BarChart from "../components/charts/BarChart";
import { Card, SectionHeader, KpiTile, Badge, StatusDot } from "../components/ui/primitives";
import { SkeletonGrid, SkeletonChart, SkeletonTable } from "../components/ui/Skeleton";
import { ErrorPanel } from "../components/ui/ErrorPanel";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

const STATUS_VARIANTS = { active: "ok", warn: "warn", idle: "neutral" };
const STATUS_LABELS = { active: "Active", warn: "Low Activity", idle: "Idle" };

export default function BranchIntelligence() {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");

  const params = {};
  if (search) params.search = search;
  if (region !== "all") params.region = region;

  const { data, loading, error, refetch } = useApi(
    () => api.branches(params),
    [search, region]
  );

  if (error) return <ErrorPanel message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Badge variant="accent"><Building2 className="h-3 w-3" /> Branch Analytics</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Branch Intelligence</h2>
          <p className="mt-1 text-sm text-ink-soft">Live data from MySQL · branch-level analytics</p>
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
          <SkeletonGrid count={4} />
          <div className="grid gap-6 xl:grid-cols-2">
            <SkeletonChart />
            <SkeletonChart />
          </div>
          <SkeletonTable rows={8} cols={6} />
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile label="Total Branches" value={data.total} delta="Loaded from MySQL" deltaTone="soft" icon={Building2} />
            <KpiTile label="Regions" value={data.regions.labels.length} delta="Operational" deltaTone="soft" icon={Building2} />
            <KpiTile label="Top Region" value={data.regions.labels[0] || "—"} delta={`${data.regions.data[0] || 0} branches`} deltaTone="soft" icon={Building2} />
            <KpiTile label="With OTP" value={data.branches.filter((b) => b.otp > 0).length} delta="Active branches" deltaTone="ok" icon={Building2} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="p-6">
              <SectionHeader title="Branches by Region" description="Live from MySQL" />
              <BarChart labels={data.regions.labels} data={data.regions.data} color="#06b6d4" height={260} />
            </Card>

            <Card className="p-6">
              <SectionHeader
                title="Top Branches by OTP Volume"
                description="Highest activity"
                action={<Badge variant="ok"><TrendingUp className="h-3 w-3" /> Top 8</Badge>}
              />
              <div className="mt-2 space-y-2.5">
                {data.branches.slice(0, 8).map((b, i) => (
                  <div key={b.bm} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-bg-hover text-2xs font-bold text-ink-mute">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm text-ink">{b.name}</div>
                        <div className="mono-num text-2xs text-ink-mute">{b.bm}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="mono-num text-sm font-semibold text-accent">{b.otp.toLocaleString()}</span>
                      <StatusDot status={b.status === "active" ? "ok" : "warn"} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-line px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-md font-semibold text-ink">All Branches</h3>
                <p className="mt-0.5 text-xs text-ink-soft">{data.branches.length} branches shown</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-mute" />
                  <input
                    type="text"
                    placeholder="Search branch or code…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-64 rounded-lg border border-line bg-bg py-2 pl-9 pr-3 text-xs text-ink placeholder-ink-mute outline-none focus:border-accent"
                  />
                </div>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="rounded-lg border border-line bg-bg px-3 py-2 text-xs text-ink-soft outline-none focus:border-accent"
                >
                  <option value="all">All Regions</option>
                  {data.regions.labels.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-subtle/50">
                  <tr>
                    {["BM Code", "Branch Name", "Region", "Employees", "OTP Count", "Last OTP", "Status"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.branches.map((b) => (
                    <tr key={b.bm} className="cursor-pointer hover:bg-bg-hover/40">
                      <td className="mono-num whitespace-nowrap px-6 py-3.5 text-accent">{b.bm}</td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-ink">{b.name}</td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-ink-soft">{b.region}</td>
                      <td className="mono-num whitespace-nowrap px-6 py-3.5 text-ink-soft">{b.employees}</td>
                      <td className="mono-num whitespace-nowrap px-6 py-3.5 font-semibold text-ink">{b.otp.toLocaleString()}</td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-xs text-ink-mute">{b.lastOtp}</td>
                      <td className="whitespace-nowrap px-6 py-3.5">
                        <Badge variant={STATUS_VARIANTS[b.status]}>{STATUS_LABELS[b.status]}</Badge>
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