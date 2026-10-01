import { useState, useMemo } from "react";
import {
  BarChart3, RefreshCw, Maximize2, Minimize2, Download, Filter,
  Building2, Users, KeyRound, HeartPulse, X,
} from "lucide-react";
import LineChart from "../components/charts/LineChart";
import DonutChart from "../components/charts/DonutChart";
import BarChart from "../components/charts/BarChart";
import { Card, Badge, StatusDot } from "../components/ui/primitives";
import { SkeletonGrid, SkeletonChart, SkeletonTable } from "../components/ui/Skeleton";
import { ErrorPanel } from "../components/ui/ErrorPanel";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

const KPI_ICONS = {
  branches: Building2,
  employees: Users,
  otp: KeyRound,
  etlRate: HeartPulse,
};

const DATE_RANGES = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export default function BiDashboard() {
  const [region, setRegion] = useState("all");
  const [purpose, setPurpose] = useState("all");
  const [days, setDays] = useState(30);
  const [fullscreen, setFullscreen] = useState(false);
  const [sortKey, setSortKey] = useState("otp");
  const [sortDir, setSortDir] = useState("desc");

  const params = useMemo(() => {
    const p = { days };
    if (region !== "all") p.region = region;
    if (purpose !== "all") p.purpose = purpose;
    return p;
  }, [region, purpose, days]);

  const { data, loading, error, refetch } = useApi(
    () => api.bi(params),
    [region, purpose, days]
  );

  const activeFilters = [
    region !== "all" && { label: "Region", value: region, clear: () => setRegion("all") },
    purpose !== "all" && { label: "Purpose", value: purpose, clear: () => setPurpose("all") },
  ].filter(Boolean);

  const sortedDetail = useMemo(() => {
    if (!data?.detail) return [];
    const arr = [...data.detail];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [data?.detail, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = data.detail;
    const headers = ["BM Code", "Branch", "Region", "Employees", "OTP", "OTP per Employee"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [r.bm, `"${r.name}"`, r.region, r.employees, r.otp, r.otpPerEmployee].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bi_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) return <ErrorPanel message={error} onRetry={refetch} />;

  return (
    <div className={`space-y-4 ${fullscreen ? "fixed inset-0 z-50 bg-bg p-6 overflow-y-auto" : ""}`}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="accent">
            <BarChart3 className="h-3 w-3" /> Business Intelligence
          </Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            BI Dashboard
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Slicer-driven, cross-filtered report — live from MySQL
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={refetch}
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={exportCSV}
            disabled={!data}
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="focus-ring inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-bg hover:brightness-110"
          >
            {fullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
            {fullscreen ? "Exit" : "Full Screen"}
          </button>
        </div>
      </div>

      {/* Layout: Slicers + Canvas */}
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* Slicer Panel */}
        <Card className="h-fit space-y-4 p-4">
          <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-widest text-ink-mute">
            <Filter className="h-3 w-3" /> Slicers
          </div>

          {/* Region */}
          <div>
            <div className="mb-2 text-xs font-medium text-ink-soft">Region</div>
            <div className="space-y-1">
              <SlicerOption
                label="All Regions"
                active={region === "all"}
                onClick={() => setRegion("all")}
              />
              {data?.filterOptions.regions.map((r) => (
                <SlicerOption
                  key={r}
                  label={r}
                  active={region === r}
                  onClick={() => setRegion(r)}
                />
              ))}
            </div>
          </div>

          {/* Purpose */}
          <div>
            <div className="mb-2 text-xs font-medium text-ink-soft">Purpose</div>
            <div className="space-y-1">
              <SlicerOption
                label="All Purposes"
                active={purpose === "all"}
                onClick={() => setPurpose("all")}
              />
              {data?.filterOptions.purposes.slice(0, 6).map((p) => (
                <SlicerOption
                  key={p}
                  label={p}
                  active={purpose === p}
                  onClick={() => setPurpose(p)}
                />
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <div className="mb-2 text-xs font-medium text-ink-soft">Time Period</div>
            <div className="space-y-1">
              {DATE_RANGES.map((r) => (
                <SlicerOption
                  key={r.value}
                  label={`Last ${r.label}`}
                  active={days === r.value}
                  onClick={() => setDays(r.value)}
                />
              ))}
            </div>
          </div>

          {activeFilters.length > 0 && (
            <button
              onClick={() => {
                setRegion("all");
                setPurpose("all");
              }}
              className="w-full rounded-lg border border-line bg-bg-hover/30 px-3 py-2 text-xs font-semibold text-ink-soft hover:border-err/40 hover:text-err"
            >
              Clear all filters
            </button>
          )}
        </Card>

        {/* Report Canvas */}
        <div className="space-y-4">
          {/* Active filters ribbon */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">
                Active:
              </span>
              {activeFilters.map((f, i) => (
                <button
                  key={i}
                  onClick={f.clear}
                  className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20"
                >
                  {f.label}: {f.value}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <>
              <SkeletonGrid count={4} />
              <div className="grid gap-4 xl:grid-cols-2">
                <SkeletonChart />
                <SkeletonChart />
              </div>
              <SkeletonTable rows={6} cols={6} />
            </>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <BiKpi
                  label="Total Branches"
                  value={data.kpis.branches.toLocaleString()}
                  icon={KPI_ICONS.branches}
                  color="text-accent"
                  bg="bg-accent/10"
                />
                <BiKpi
                  label="Total Employees"
                  value={data.kpis.employees.toLocaleString()}
                  icon={KPI_ICONS.employees}
                  color="text-violet-400"
                  bg="bg-violet-500/10"
                />
                <BiKpi
                  label="OTP in Period"
                  value={data.kpis.otp.toLocaleString()}
                  icon={KPI_ICONS.otp}
                  color="text-warn"
                  bg="bg-warn/10"
                />
                <BiKpi
                  label="ETL Success Rate"
                  value={`${data.kpis.etlRate}%`}
                  icon={KPI_ICONS.etlRate}
                  color="text-ok"
                  bg="bg-ok/10"
                />
              </div>

              {/* Row 1: Trend + Purpose */}
              <div className="grid gap-4 xl:grid-cols-3">
                <Card className="p-5 xl:col-span-2">
                  <CanvasTitle title="OTP Trend" subtitle={`Last ${days} days`} />
                  <LineChart
                    labels={data.trend.labels}
                    data={data.trend.data}
                    color="#06b6d4"
                    height={240}
                  />
                </Card>

                <Card className="p-5">
                  <CanvasTitle title="By Purpose" subtitle="Distribution" />
                  <DonutChart
                    labels={data.byPurpose.labels}
                    data={data.byPurpose.data}
                    colors={data.byPurpose.colors}
                    height={240}
                  />
                </Card>
              </div>

              {/* Row 2: Operators + Branches */}
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="p-5">
                  <CanvasTitle title="Top Operators" subtitle="By OTP volume" />
                  <BarChart
                    labels={data.topOperators.labels}
                    data={data.topOperators.data}
                    color="#f59e0b"
                    height={240}
                  />
                </Card>

                <Card className="p-5">
                  <CanvasTitle title="Top Branches" subtitle="By OTP volume" />
                  <BarChart
                    labels={data.topBranches.labels}
                    data={data.topBranches.data}
                    color="#10b981"
                    height={240}
                  />
                </Card>
              </div>

              {/* Detail Table */}
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <div>
                    <div className="text-md font-semibold text-ink">Branch Detail</div>
                    <div className="mt-0.5 text-xs text-ink-soft">
                      {sortedDetail.length} rows · sorted by {sortKey}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-bg-subtle/50">
                      <tr>
                        <SortableTH
                          label="BM Code"
                          sortKey="bm"
                          current={sortKey}
                          dir={sortDir}
                          onClick={toggleSort}
                        />
                        <SortableTH
                          label="Branch"
                          sortKey="name"
                          current={sortKey}
                          dir={sortDir}
                          onClick={toggleSort}
                        />
                        <SortableTH
                          label="Region"
                          sortKey="region"
                          current={sortKey}
                          dir={sortDir}
                          onClick={toggleSort}
                        />
                        <SortableTH
                          label="Employees"
                          sortKey="employees"
                          current={sortKey}
                          dir={sortDir}
                          onClick={toggleSort}
                          align="right"
                        />
                        <SortableTH
                          label="OTP"
                          sortKey="otp"
                          current={sortKey}
                          dir={sortDir}
                          onClick={toggleSort}
                          align="right"
                        />
                        <SortableTH
                          label="OTP / Employee"
                          sortKey="otpPerEmployee"
                          current={sortKey}
                          dir={sortDir}
                          onClick={toggleSort}
                          align="right"
                        />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {sortedDetail.map((r) => (
                        <tr key={r.bm} className="hover:bg-bg-hover/40">
                          <td className="mono-num whitespace-nowrap px-5 py-3 text-accent">
                            {r.bm}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-ink">
                            {r.name}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-ink-soft">
                            {r.region}
                          </td>
                          <td className="mono-num whitespace-nowrap px-5 py-3 text-right text-ink-soft">
                            {r.employees}
                          </td>
                          <td className="mono-num whitespace-nowrap px-5 py-3 text-right font-semibold text-ink">
                            {r.otp.toLocaleString()}
                          </td>
                          <td className="mono-num whitespace-nowrap px-5 py-3 text-right text-ink-soft">
                            {r.otpPerEmployee}
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
      </div>
    </div>
  );
}

/* ─── Subcomponents ─── */

function SlicerOption({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-1.5 text-left text-xs font-medium transition ${
        active
          ? "bg-accent/15 text-accent"
          : "text-ink-soft hover:bg-bg-hover hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function BiKpi({ label, value, icon: Icon, color, bg }) {
  return (
    <Card hover className="p-4">
      <div className="flex items-start justify-between">
        <div className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">
          {label}
        </div>
        <div className={`rounded-md ${bg} p-1.5 ${color}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className={`mono-num mt-3 text-2xl font-semibold ${color}`}>
        {value}
      </div>
    </Card>
  );
}

function CanvasTitle({ title, subtitle }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold text-ink">{title}</div>
        <div className="mt-0.5 text-2xs text-ink-mute">{subtitle}</div>
      </div>
      <StatusDot status="ok" pulse />
    </div>
  );
}

function SortableTH({ label, sortKey, current, dir, onClick, align = "left" }) {
  const active = current === sortKey;
  return (
    <th
      onClick={() => onClick(sortKey)}
      className={`cursor-pointer whitespace-nowrap px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute hover:text-ink ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {label}
      {active && (
        <span className="ml-1 text-accent">{dir === "asc" ? "▲" : "▼"}</span>
      )}
    </th>
  );
}