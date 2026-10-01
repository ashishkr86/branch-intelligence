import { useState } from "react";
import {
  Settings as SettingsIcon, Database, Server, Bell,
  User, Save, CheckCircle2, KeyRound, Palette, Shield,
} from "lucide-react";
import { Card, SectionHeader, Badge, StatusDot } from "../components/ui/primitives";

const TABS = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "database", label: "Database", icon: Database },
  { id: "api", label: "API", icon: Server },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "profile", label: "Profile", icon: User },
];

export default function Settings() {
  const [tab, setTab] = useState("general");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="accent">
            <SettingsIcon className="h-3 w-3" /> Configuration
          </Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            Settings
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Platform configuration, connections and preferences.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="focus-ring inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg shadow-lg shadow-accent/20 transition hover:brightness-110"
        >
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Changes
            </>
          )}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Tabs sidebar */}
        <Card className="h-fit p-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-ink-soft hover:bg-bg-hover hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </Card>

        {/* Tab content */}
        <div className="space-y-6">
          {tab === "general" && <GeneralTab />}
          {tab === "database" && <DatabaseTab />}
          {tab === "api" && <ApiTab />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "profile" && <ProfileTab />}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Tabs ─────────────── */

function GeneralTab() {
  return (
    <>
      <Card className="p-6">
        <SectionHeader
          title="Platform"
          description="General settings for the dashboard"
        />
        <div className="mt-4 space-y-4">
          <Field label="Platform Name" value="Branch Intelligence" />
          <Field label="Environment" value="Local Development" hint="Values: local · staging · production" />
          <Field label="Timezone" value="Asia/Kolkata (IST)" />
          <Field label="Date Format" value="YYYY-MM-DD" />
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeader
          title="Appearance"
          description="Theme and layout preferences"
          action={<Palette className="h-4 w-4 text-ink-mute" />}
        />
        <div className="mt-4 space-y-3">
          <ToggleRow label="Dark Theme" description="Platform is optimized for dark mode" defaultOn />
          <ToggleRow label="Compact Tables" description="Show more rows per screen" />
          <ToggleRow label="Show Live Indicators" description="Pulsing dots on active components" defaultOn />
        </div>
      </Card>
    </>
  );
}

function DatabaseTab() {
  return (
    <>
      <Card className="border-ok/30 bg-ok/5 p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-ok/15 text-ok">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">Connected</span>
              <StatusDot status="ok" pulse />
            </div>
            <div className="mt-1 text-xs text-ink-soft">
              MySQL 8.0 · gentech_db
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeader
          title="Connection"
          description="MySQL connection parameters (from .env)"
        />
        <div className="mt-4 space-y-4">
          <Field label="Host" value="localhost" mono />
          <Field label="Port" value="3306" mono />
          <Field label="Database" value="gentech_db" mono />
          <Field label="User" value="root" mono />
          <Field label="Password" value="••••••••" mono hint="Edit in backend/.env" />
        </div>
        <div className="mt-4 text-xs text-ink-mute">
          Live row counts are on the Monitoring page.
        </div>
      </Card>
    </>
  );
}

function ApiTab() {
  return (
    <>
      <Card className="border-ok/30 bg-ok/5 p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-ok/15 text-ok">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">API Running</span>
              <StatusDot status="ok" pulse />
            </div>
            <div className="mt-1 text-xs text-ink-soft">
              FastAPI · Uvicorn · http://localhost:8000
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeader title="Endpoints" description="Registered API routes" />
        <div className="mt-4 space-y-2">
          {[
            { method: "GET", path: "/api/overview", desc: "KPIs" },
            { method: "GET", path: "/api/branches", desc: "Branch list" },
            { method: "GET", path: "/api/workforce", desc: "Employees" },
            { method: "GET", path: "/api/otp/summary", desc: "OTP analytics" },
            { method: "GET", path: "/api/etl/history", desc: "Run history" },
            { method: "GET", path: "/api/analytics", desc: "Business SQL" },
            { method: "GET", path: "/api/monitoring", desc: "System health" },
          ].map((e) => (
            <div
              key={e.path}
              className="flex items-center gap-4 rounded-lg border border-line bg-bg-hover/30 px-4 py-2.5"
            >
              <Badge variant="ok">{e.method}</Badge>
              <span className="mono-num flex-1 text-xs text-ink">{e.path}</span>
              <span className="text-xs text-ink-mute">{e.desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-line bg-bg-hover/30 p-3 text-center">
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-accent hover:underline"
          >
            Open Interactive API Docs (Swagger UI) →
          </a>
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeader title="Security" description="API access" />
        <div className="mt-4 space-y-3">
          <ToggleRow label="CORS Enabled" description="Allows http://localhost:5173" defaultOn />
          <ToggleRow label="Request Logging" description="Log all API calls" defaultOn />
          <ToggleRow label="Rate Limiting" description="Not configured in local dev" />
        </div>
      </Card>
    </>
  );
}

function NotificationsTab() {
  return (
    <Card className="p-6">
      <SectionHeader
        title="Alert Preferences"
        description="Choose what you want to be notified about"
      />
      <div className="mt-4 space-y-3">
        <ToggleRow label="ETL Failures" description="Get notified when an ETL run fails" defaultOn />
        <ToggleRow label="Data Quality Alerts" description="When quality score drops below threshold" defaultOn />
        <ToggleRow label="Large Drops" description="When drop percentage exceeds 5%" defaultOn />
        <ToggleRow label="Daily Summary" description="Email digest at 6 PM" />
        <ToggleRow label="Weekly Report" description="Every Monday 9 AM" />
      </div>
    </Card>
  );
}

function ProfileTab() {
  return (
    <>
      <Card className="p-6">
        <SectionHeader title="Profile" description="Your account information" />
        <div className="mt-4 flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-accent to-info text-xl font-bold text-bg">
            AS
          </div>
          <div>
            <div className="text-lg font-semibold text-ink">Ashish</div>
            <div className="text-xs text-ink-soft">Data Engineer</div>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <Field label="Full Name" value="Ashish" />
          <Field label="Email" value="ashish@example.com" />
          <Field label="Role" value="Data Engineer" />
          <Field label="Timezone" value="Asia/Kolkata (IST)" />
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeader
          title="Security"
          description="Password and sessions"
          action={<Shield className="h-4 w-4 text-ink-mute" />}
        />
        <div className="mt-4 space-y-3">
          <Field label="Password" value="••••••••" mono hint="Change password" />
          <ToggleRow label="Two-Factor Authentication" description="Enabled on next login" />
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeader title="API Key" description="For external integrations (future)" action={<KeyRound className="h-4 w-4 text-ink-mute" />} />
        <div className="mt-4 rounded-lg border border-line bg-bg p-4">
          <div className="flex items-center justify-between">
            <span className="mono-num text-xs text-ink-soft">sk_live_••••••••••••••••••••••••</span>
            <Badge variant="neutral">Hidden</Badge>
          </div>
          <div className="mt-3 text-2xs text-ink-mute">
            API key management will be available in the cloud version.
          </div>
        </div>
      </Card>
    </>
  );
}

/* ─────────────── Helpers ─────────────── */

function Field({ label, value, hint, mono = false }) {
  return (
    <div>
      <label className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">
        {label}
      </label>
      <div
        className={`mt-1.5 flex h-10 items-center rounded-lg border border-line bg-bg px-3 text-sm text-ink ${
          mono ? "mono-num" : ""
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-2xs text-ink-mute">{hint}</div>}
    </div>
  );
}

function ToggleRow({ label, description, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-bg-hover/30 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="mt-0.5 text-xs text-ink-soft">{description}</div>
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`relative h-5 w-9 flex-shrink-0 rounded-full transition ${
          on ? "bg-accent" : "bg-bg-hover"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}