import { NAV_GROUPS } from "../../data/nav";
import { StatusDot } from "../ui/primitives";

export default function Sidebar({ currentPage, onNavigate }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-line bg-bg-subtle">
      <div className="flex h-16 items-center gap-3 border-b border-line px-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-info text-bg shadow-lg shadow-accent/20">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold tracking-tight text-ink">
            Branch Intelligence
          </div>
          <div className="text-2xs text-ink-mute">Data Platform · v1.0</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto scrollbar-thin px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-widest text-ink-mute">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={item.description}
                    className={`focus-ring group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-ink-soft hover:bg-bg-hover hover:text-ink"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 flex-shrink-0 ${
                        isActive
                          ? "text-accent"
                          : "text-ink-mute group-hover:text-ink-soft"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <div className="rounded-lg border border-line bg-bg px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">
              System
            </span>
            <StatusDot status="ok" pulse label="Live" />
          </div>
          <div className="space-y-1.5 text-xs">
            <HealthRow label="MySQL" status="ok" />
            <HealthRow label="API" status="ok" />
            <HealthRow label="ETL" status="ok" />
          </div>
          <div className="mt-3 border-t border-line pt-3 text-2xs text-ink-faint">
            Local · <span className="text-ink-mute">branch_intelligence</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function HealthRow({ label, status }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-soft">{label}</span>
      <StatusDot status={status} />
    </div>
  );
}