/* ─── Card ─── */
export function Card({ children, className = "", hover = false }) {
  return (
    <div className={`card ${hover ? "card-hover" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* ─── Section Header ─── */
export function SectionHeader({ title, description, action }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-sm text-ink-soft">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ─── Status Dot ─── */
const STATUS_COLORS = {
  ok: "bg-ok",
  success: "bg-ok",
  warn: "bg-warn",
  warning: "bg-warn",
  err: "bg-err",
  error: "bg-err",
  info: "bg-info",
  idle: "bg-ink-faint",
  pending: "bg-ink-faint",
  running: "bg-accent",
};

export function StatusDot({ status = "idle", pulse = false, label }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.idle;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`status-dot ${color} ${pulse ? "status-dot-pulse" : ""}`}
      />
      {label && <span className="text-xs text-ink-soft">{label}</span>}
    </span>
  );
}

/* ─── Badge ─── */
const BADGE_STYLES = {
  ok: "bg-ok/10 text-ok border-ok/20",
  success: "bg-ok/10 text-ok border-ok/20",
  warn: "bg-warn/10 text-warn border-warn/20",
  warning: "bg-warn/10 text-warn border-warn/20",
  err: "bg-err/10 text-err border-err/20",
  error: "bg-err/10 text-err border-err/20",
  info: "bg-info/10 text-info border-info/20",
  accent: "bg-accent/10 text-accent border-accent/20",
  neutral: "bg-bg-hover text-ink-soft border-line-strong",
};

export function Badge({ children, variant = "neutral", className = "" }) {
  const style = BADGE_STYLES[variant] || BADGE_STYLES.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider ${style} ${className}`}
    >
      {children}
    </span>
  );
}

/* ─── KPI Tile ─── */
export function KpiTile({
  label,
  value,
  delta,
  deltaTone = "soft",
  icon: Icon,
  spark,
  hint,
}) {
  const deltaColors = {
    soft: "text-ink-soft",
    ok: "text-ok",
    warn: "text-warn",
    err: "text-err",
  };

  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between">
        <div className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">
          {label}
        </div>
        {Icon && (
          <div className="rounded-md bg-bg-hover p-1.5 text-ink-soft">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end gap-3">
        <div className="mono-num text-3xl font-semibold tracking-tight text-ink">
          {value}
        </div>
        {delta && (
          <div className={`pb-1 text-xs font-medium ${deltaColors[deltaTone]}`}>
            {delta}
          </div>
        )}
      </div>

      {spark && <div className="mt-3">{spark}</div>}

      {hint && <div className="mt-3 text-xs text-ink-mute">{hint}</div>}
    </Card>
  );
}

/* ─── Progress Bar ─── */
export function ProgressBar({
  value = 0,
  tone = "accent",
  size = "md",
  showLabel = false,
  animated = false,
}) {
  const tones = {
    accent: "bg-accent",
    ok: "bg-ok",
    warn: "bg-warn",
    err: "bg-err",
  };
  const heights = { sm: "h-1", md: "h-1.5" };
  return (
    <div>
      <div
        className={`w-full overflow-hidden rounded-full bg-bg-hover ${heights[size]}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${tones[tone]} ${
            animated ? "animate-pulse-soft" : ""
          }`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-right text-2xs text-ink-mute">{value}%</div>
      )}
    </div>
  );
}

/* ─── Sparkline ─── */
export function Sparkline({
  data = [],
  color = "#06b6d4",
  height = 24,
  width = 80,
}) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1 || 1);

  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

/* ─── Data Table ─── */
export function DataTable({ columns, rows, emptyState }) {
  if (!rows || rows.length === 0) {
    return (
      <Card className="p-10 text-center">
        <div className="text-sm text-ink-mute">
          {emptyState || "No data yet."}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-bg-subtle/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-mute ${
                    col.align === "right" ? "text-right" : ""
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, i) => (
              <tr key={i} className="transition-colors hover:bg-bg-hover/50">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`whitespace-nowrap px-5 py-3.5 text-ink-soft ${
                      col.align === "right" ? "text-right" : ""
                    } ${col.mono ? "mono-num" : ""} ${
                      col.emphasis ? "text-ink font-medium" : ""
                    }`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ─── Empty State ─── */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Card className="flex flex-col items-center justify-center px-8 py-16 text-center">
      {Icon && (
        <div className="mb-4 rounded-xl bg-bg-hover p-3 text-ink-mute">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-md font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-ink-soft">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}