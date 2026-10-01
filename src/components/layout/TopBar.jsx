import { useState } from "react";
import {
  Bell, Search, Command, ChevronDown, LogOut, User,
  Settings as SettingsIcon,
} from "lucide-react";
import { PAGE_META } from "../../data/nav";
import { StatusDot } from "../ui/primitives";
import { useAuth } from "../../context/AuthContext";

export default function TopBar({ currentPage }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = PAGE_META[currentPage] || { title: "—", subtitle: "" };

  const initials = user
    ? (user.fullName || user.username)
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-bg/80 px-6 backdrop-blur-xl">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-2xs font-medium uppercase tracking-widest text-ink-mute">
          <span>Platform</span>
          <span className="text-ink-faint">/</span>
          <span className="text-accent">{meta.title}</span>
        </div>
        <h1 className="mt-0.5 truncate text-md font-semibold tracking-tight text-ink">
          {meta.title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button className="focus-ring group hidden items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-1.5 text-xs text-ink-mute transition-colors hover:border-line-strong hover:text-ink-soft md:flex">
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <kbd className="ml-4 flex items-center gap-0.5 rounded border border-line bg-bg px-1.5 py-0.5 font-mono text-2xs">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        <div className="hidden items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-1.5 sm:flex">
          <StatusDot status="ok" pulse />
          <span className="text-xs font-medium text-ink-soft">Live</span>
        </div>

        <button className="focus-ring relative rounded-lg border border-line bg-bg-elevated p-2 text-ink-soft transition-colors hover:border-line-strong hover:text-ink">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-bg-elevated" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="focus-ring flex items-center gap-2 rounded-lg border border-line bg-bg-elevated py-1 pl-1 pr-2 transition-colors hover:border-line-strong"
          >
            <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-accent to-info text-2xs font-bold text-bg">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-xs font-semibold leading-tight text-ink">
                {user?.fullName || user?.username}
              </div>
              <div className="text-2xs capitalize leading-tight text-ink-mute">
                {user?.role}
              </div>
            </div>
            <ChevronDown className="hidden h-3 w-3 text-ink-mute sm:block" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-line bg-bg-elevated p-1 shadow-xl">
                <div className="border-b border-line px-3 py-3">
                  <div className="text-xs font-semibold text-ink">
                    {user?.fullName || user?.username}
                  </div>
                  <div className="mt-0.5 truncate text-2xs text-ink-mute">
                    {user?.email}
                  </div>
                  <div className="mt-1 inline-flex rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-accent">
                    {user?.role}
                  </div>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-ink-soft hover:bg-bg-hover hover:text-ink"
                >
                  <User className="h-3.5 w-3.5" /> Profile
                </button>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-ink-soft hover:bg-bg-hover hover:text-ink"
                >
                  <SettingsIcon className="h-3.5 w-3.5" /> Settings
                </button>
                <div className="my-1 border-t border-line" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-semibold text-err hover:bg-err/10"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}