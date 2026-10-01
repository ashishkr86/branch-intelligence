import { useState } from "react";
import { Users, Search, UserCheck, RefreshCw } from "lucide-react";
import BarChart from "../components/charts/BarChart";
import { Card, SectionHeader, KpiTile, Badge } from "../components/ui/primitives";
import { SkeletonGrid, SkeletonChart, SkeletonTable } from "../components/ui/Skeleton";
import { ErrorPanel } from "../components/ui/ErrorPanel";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

export default function Workforce() {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");

  const params = {};
  if (search) params.search = search;
  if (region !== "all") params.region = region;

  const { data, loading, error, refetch } = useApi(
    () => api.workforce(params),
    [search, region]
  );

  if (error) return <ErrorPanel message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Badge variant="accent"><Users className="h-3 w-3" /> People Analytics</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">Workforce</h2>
          <p className="mt-1 text-sm text-ink-soft">Live employee data from MySQL</p>
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
            <KpiTile label="Total Employees" value={data.total.toLocaleString()} delta="All branches" deltaTone="soft" icon={UserCheck} />
            <KpiTile label="Regions" value={data.byRegion.labels.length} delta="Coverage" deltaTone="soft" icon={UserCheck} />
            <KpiTile label="Top Region" value={data.byRegion.labels[0] || "—"} delta={`${data.byRegion.data[0] || 0} employees`} deltaTone="soft" icon={UserCheck} />
            <KpiTile label="Avg per Branch" value={data.total > 0 ? Math.round(data.total / data.byBranch.labels.length) : 0} delta="Steady" deltaTone="soft" icon={UserCheck} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="p-6">
              <SectionHeader title="Employees by Region" description="Live from MySQL" />
              <BarChart labels={data.byRegion.labels} data={data.byRegion.data} color="#8b5cf6" height={260} />
            </Card>

            <Card className="p-6">
              <SectionHeader title="Top Branches by Headcount" description="Largest teams" />
              <BarChart labels={data.byBranch.labels} data={data.byBranch.data} color="#06b6d4" height={260} />
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-line px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-md font-semibold text-ink">All Employees</h3>
                <p className="mt-0.5 text-xs text-ink-soft">{data.total} employees shown</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-mute" />
                  <input
                    type="text"
                    placeholder="Search name, number, branch…"
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
                  {data.byRegion.labels.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-subtle/50">
                  <tr>
                    {["Employee", "Number", "BM Code", "Branch", "Region", "Created"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.employees.map((e) => (
                    <tr key={e.number} className="hover:bg-bg-hover/40">
                      <td className="whitespace-nowrap px-6 py-3.5 font-medium text-ink">{e.name}</td>
                      <td className="mono-num whitespace-nowrap px-6 py-3.5 text-accent">{e.number}</td>
                      <td className="mono-num whitespace-nowrap px-6 py-3.5 text-ink-soft">{e.bm}</td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-ink-soft">{e.branch}</td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-ink-soft">{e.region}</td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-xs text-ink-mute">{e.createdAt}</td>
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