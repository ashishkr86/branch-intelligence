import {
  Building2, Users, KeyRound, HeartPulse, Upload, ArrowRight, RefreshCw,
  BarChart3, ShieldCheck, Activity, Workflow,
} from "lucide-react";
import { Card, SectionHeader, KpiTile, Badge } from "../components/ui/primitives";
import { SkeletonGrid } from "../components/ui/Skeleton";
import { ErrorPanel } from "../components/ui/ErrorPanel";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

const KPI_ICONS = { branches: Building2, employees: Users, otps: KeyRound, etlHealth: HeartPulse };
const KPI_LABELS = { branches: "Branches", employees: "Employees", otps: "OTP Records", etlHealth: "ETL Health" };
const KPI_NOTES = {
  branches: "Across all regions",
  employees: "Total workforce",
  otps: "All-time records",
  etlHealth: "Pipeline health",
};

// Each detail lives on exactly one page. Change the `page` ids to match your router.
const EXPLORE = [
  { page: "otp", icon: KeyRound, title: "OTP Intelligence", desc: "Trend, purpose split, hourly activity, recent records" },
  { page: "branches", icon: Building2, title: "Branch Intelligence", desc: "Regions, top branches, full branch list" },
  { page: "workforce", icon: Users, title: "Workforce", desc: "Employees by region and by branch" },
  { page: "analytics", icon: BarChart3, title: "Analytics", desc: "Operator summary and branches without OTP" },
  { page: "etl", icon: Workflow, title: "ETL Pipeline", desc: "Full run history and success rate" },
  { page: "quality", icon: ShieldCheck, title: "Data Quality", desc: "Validation checks by table and column" },
  { page: "monitoring", icon: Activity, title: "Monitoring", desc: "System health and table row counts" },
];

export default function Overview({ onNavigate }) {
  const { data, loading, error, refetch } = useApi(() => api.overview());

  if (error) return <ErrorPanel message={error} onRetry={refetch} />;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-6 w-48 animate-pulse rounded bg-bg-hover" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-bg-hover" />
        </div>
        <SkeletonGrid count={4} />
      </div>
    );
  }

  const kpis = [
    { id: "branches", value: data.kpis.branches.toLocaleString() },
    { id: "employees", value: data.kpis.employees.toLocaleString() },
    { id: "otps", value: data.kpis.otps.toLocaleString() },
    { id: "etlHealth", value: `${data.kpis.etlHealth}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge variant="accent">Platform Control Center</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            Good morning, Ashish 👋
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Live data from MySQL · <span className="text-ok">● Connected</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={() => onNavigate("ingestion")}
            className="focus-ring inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg shadow-lg shadow-accent/20 transition hover:brightness-110"
          >
            <Upload className="h-4 w-4" /> Upload Data
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <KpiTile
            key={k.id}
            label={KPI_LABELS[k.id]}
            value={k.value}
            delta={KPI_NOTES[k.id]}
            deltaTone="soft"
            icon={KPI_ICONS[k.id]}
          />
        ))}
      </div>

      <div>
        <SectionHeader title="Explore" description="Each page owns its own charts and tables" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {EXPLORE.map((e) => {
            const Icon = e.icon;
            return (
              <button
                key={e.page}
                onClick={() => onNavigate(e.page)}
                className="text-left"
              >
                <Card hover className="flex h-full items-start gap-4 p-5">
                  <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">{e.title}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-ink-mute" />
                    </div>
                    <div className="mt-1 text-xs text-ink-soft">{e.desc}</div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}