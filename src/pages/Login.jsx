import { useState } from "react";
import { Zap, Loader2, AlertCircle, UserPlus, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, email, password, fullName);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg bg-grid px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-info text-bg shadow-lg shadow-accent/20">
            <Zap className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">
            Branch Intelligence
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Data Platform · Local Development
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-line bg-bg-elevated p-8 shadow-2xl">
          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-lg border border-line bg-bg p-1">
            <button
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${
                mode === "login"
                  ? "bg-accent/15 text-accent"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <LogIn className="mx-auto mr-1 inline h-3 w-3" /> Sign In
            </button>
            <button
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${
                mode === "register"
                  ? "bg-accent/15 text-accent"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <UserPlus className="mx-auto mr-1 inline h-3 w-3" /> Register
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-err/30 bg-err/5 px-3 py-2 text-xs text-err">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder-ink-mute outline-none focus:border-accent"
                placeholder="admin"
              />
            </div>

            {mode === "register" && (
              <>
                <div>
                  <label className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder-ink-mute outline-none focus:border-accent"
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <label className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder-ink-mute outline-none focus:border-accent"
                    placeholder="Optional"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder-ink-mute outline-none focus:border-accent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="focus-ring mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg shadow-lg shadow-accent/20 transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Please wait…
                </>
              ) : mode === "login" ? (
                <>
                  <LogIn className="h-4 w-4" /> Sign In
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Create Account
                </>
              )}
            </button>
          </form>

          {/* First-time hint */}
          {mode === "login" && (
            <div className="mt-6 rounded-lg border border-line bg-bg-hover/30 px-4 py-3">
              <div className="text-2xs font-semibold uppercase tracking-widest text-ink-mute">
                First-time setup?
              </div>
              <div className="mt-1 text-xs text-ink-soft">
                Run{" "}
                <code className="mono-num text-accent">
                  python scripts\seed_admin.py
                </code>{" "}
                to create the default admin
                <span className="ml-1 text-ink-mute">(admin / admin1234)</span>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-2xs text-ink-mute">
          Local development · MySQL{" "}
          <span className="mono-num">gentech_db</span>
        </p>
      </div>
    </div>
  );
}