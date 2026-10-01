import {
  Cloud, Users, Globe, Network, Server, Database, Workflow,
  HardDrive, BarChart3, PieChart, ArrowDown, CheckCircle2, Clock,
  Layers, Package, GitBranch, Activity,
} from "lucide-react";
import { Card, SectionHeader, Badge, StatusDot } from "../components/ui/primitives";
import { layers, techStack, roadmap, cloudStatus } from "../data/mockCloud";

const ICONS = {
  Users, Globe, Network, Server, Database, Workflow,
  HardDrive, BarChart3, PieChart,
};

export default function CloudArchitecture() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Badge variant="accent"><Cloud className="h-3 w-3" /> Roadmap</Badge>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Cloud Architecture
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Local-first design → production-ready on AWS.
        </p>
      </div>

      {/* Top summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={CheckCircle2}
          label="Live Components"
          value={layers.filter((l) => l.status === "live").length}
          total={layers.length}
          tone="ok"
        />
        <SummaryCard
          icon={Clock}
          label="Planned Components"
          value={layers.filter((l) => l.status === "future").length}
          total={layers.length}
          tone="warn"
        />
        <SummaryCard
          icon={Layers}
          label="Tech Stack"
          value={techStack.reduce((acc, s) => acc + s.items.length, 0)}
          total={techStack.reduce((acc, s) => acc + s.items.length, 0)}
          tone="accent"
        />
        <SummaryCard
          icon={GitBranch}
          label="Roadmap Phases"
          value={roadmap.filter((r) => r.status === "done").length}
          total={roadmap.length}
          tone="ok"
        />
      </div>

      {/* Architecture Flow */}
      <Card className="p-6">
        <SectionHeader
          title="Reference Architecture"
          description="End-to-end data flow — current + planned"
          action={
            <div className="flex items-center gap-4 text-2xs">
              <div className="flex items-center gap-2">
                <StatusDot status="ok" />
                <span className="text-ink-soft">Live</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusDot status="idle" />
                <span className="text-ink-soft">Planned</span>
              </div>
            </div>
          }
        />

        <div className="mt-6 flex flex-col items-stretch gap-2">
          {layers.map((layer, i) => {
            const Icon = ICONS[layer.icon] || Server;
            const live = layer.status === "live";
            return (
              <div key={layer.id}>
                <div
                  className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
                    live
                      ? "border-ok/30 bg-ok/5"
                      : "border-line bg-bg-elevated opacity-90"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg ${
                        live ? "bg-ok/15 text-ok" : "bg-bg-hover text-ink-mute"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink">
                          {layer.label}
                        </span>
                        {live ? (
                          <Badge variant="ok">
                            <CheckCircle2 className="h-3 w-3" /> LIVE
                          </Badge>
                        ) : (
                          <Badge variant="neutral">
                            <Clock className="h-3 w-3" /> PLANNED
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-ink-soft">
                        {layer.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-2xs text-ink-mute">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                </div>
                {i < layers.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-3 w-3 text-ink-faint" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Tech Stack */}
      <div>
        <SectionHeader
          title="Technology Stack"
          description="Tools and frameworks used across the platform"
        />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {techStack.map((cat) => (
            <Card key={cat.category} className="p-5">
              <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-widest text-ink-mute">
                <Package className="h-3 w-3" /> {cat.category}
              </div>
              <div className="mt-3 space-y-2">
                {cat.items.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-3"
                  >
                    <span
                      className={`text-sm ${
                        item.status === "live" ? "text-ink" : "text-ink-soft"
                      }`}
                    >
                      {item.name}
                    </span>
                    <StatusDot
                      status={item.status === "live" ? "ok" : "idle"}
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Roadmap */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div>
            <h3 className="flex items-center gap-2 text-md font-semibold text-ink">
              <Activity className="h-4 w-4 text-accent" /> Development Roadmap
            </h3>
            <p className="mt-0.5 text-xs text-ink-soft">
              {roadmap.filter((r) => r.status === "done").length} of{" "}
              {roadmap.length} phases complete
            </p>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {roadmap.map((phase) => {
            const done = phase.status === "done";
            return (
              <div
                key={phase.phase}
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  done
                    ? "border-ok/30 bg-ok/5"
                    : "border-line bg-bg-hover/30"
                }`}
              >
                <div
                  className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-xs font-bold ${
                    done
                      ? "bg-ok/15 text-ok"
                      : "bg-bg-hover text-ink-mute"
                  }`}
                >
                  {phase.phase}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">
                      {phase.title}
                    </span>
                    {done && (
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-ok" />
                    )}
                  </div>
                  <div className="mt-0.5 text-2xs text-ink-mute">
                    {phase.wave}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Cloud Status */}
      <Card className="p-6">
        <SectionHeader
          title="Cloud Environment Status"
          description="What's live locally vs. what's planned for AWS"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatusRow label="Local Storage" value={cloudStatus.localStorage} live />
          <StatusRow label="AWS Account" value={cloudStatus.awsAccount} />
          <StatusRow label="Containers" value={cloudStatus.containers} />
          <StatusRow label="CI Pipeline" value={cloudStatus.ciPipeline} />
          <StatusRow label="Monitoring" value={cloudStatus.monitoring} />
        </div>
        <div className="mt-6 rounded-lg border border-line bg-bg-hover/30 p-4 text-xs text-ink-soft">
          <div className="font-semibold text-ink">Current deployment target</div>
          <div className="mt-2 font-mono text-2xs">
            Frontend → http://localhost:5173 &nbsp;·&nbsp; API → http://localhost:8000
            &nbsp;·&nbsp; DB → localhost:3306
          </div>
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, total, tone }) {
  const toneColor = {
    ok: "text-ok",
    warn: "text-warn",
    accent: "text-accent",
  }[tone];

  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between">
        <div className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">
          {label}
        </div>
        <Icon className={`h-4 w-4 ${toneColor}`} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={`mono-num text-2xl font-semibold ${toneColor}`}>
          {value}
        </span>
        <span className="text-xs text-ink-mute">/ {total}</span>
      </div>
    </Card>
  );
}

function StatusRow({ label, value, live = false }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg-hover/30 px-4 py-3">
      <span className="text-xs text-ink-soft">{label}</span>
      <div className="flex items-center gap-2">
        <StatusDot status={live ? "ok" : "idle"} />
        <span className="text-xs font-medium text-ink">{value}</span>
      </div>
    </div>
  );
}