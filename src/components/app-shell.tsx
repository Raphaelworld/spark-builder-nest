import { Link, useRouterState } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Home, CalendarDays, Target, LineChart, User, Moon, Sun, Timer } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getActiveSession } from "@/lib/sessions.functions";
import { activeSessionQueryOptions } from "@/lib/session-queries";
import { remainingMs, type SessionTimerFields } from "@/lib/techniques";
import {
  applyTheme,
  getThemePreference,
  onThemeChange,
  resolveTheme,
  setThemePreference,
} from "@/lib/theme";

const NAV = [
  { to: "/today", label: "Today", icon: Home },
  { to: "/planner", label: "Planner", icon: CalendarDays },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/insights", label: "Insights", icon: LineChart },
] as const;

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () => setDark(resolveTheme(getThemePreference()) === "dark");
    applyTheme(getThemePreference());
    sync();
    return onThemeChange(sync);
  }, []);
  const toggle = () => {
    // The header toggle always sets an explicit theme; "system" lives in Settings.
    setThemePreference(dark ? "light" : "dark");
  };
  return { dark, toggle };
}

function useCountdown(session: SessionTimerFields | null | undefined) {
  const paused = !!session?.paused_at;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!session || paused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session, paused]);
  return useMemo(() => {
    if (!session) return { mmss: "00:00", done: false, paused: false };
    const remaining = remainingMs(session, now);
    const totalSec = Math.floor(remaining / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return {
      mmss: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      done: remaining === 0,
      paused,
    };
  }, [now, session, paused]);
}

function SessionMiniBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data } = useQuery(activeSessionQueryOptions());
  const active = data;
  const { mmss, paused } = useCountdown(active);
  if (!active || pathname.startsWith("/session")) return null;
  return (
    <Link
      to="/session"
      className="fixed left-1/2 top-14 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:top-16"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Timer className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="font-mono tabular-nums text-foreground">{paused ? "Paused" : mmss}</span>
      <span className="max-w-[140px] truncate text-muted-foreground">{active.task}</span>
    </Link>
  );
}

function Logo({ onTeal = false }: { onTeal?: boolean }) {
  return (
    <Link to="/today" className="flex items-center gap-2">
      <span className={`font-serif text-2xl ${onTeal ? "text-white" : "text-primary"}`}>G</span>
      <span className={`font-serif text-xl ${onTeal ? "text-white" : "text-foreground"}`}>
        Gobez
      </span>
    </Link>
  );
}

export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { dark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile top header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-deep-teal bg-deep-teal px-4 text-white md:hidden">
        <Logo onTeal />
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Link
            to="/settings"
            aria-label="Settings"
            className="rounded-full bg-white/15 p-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Desktop top navigation */}
      <header className="fixed inset-x-0 top-0 z-30 hidden h-16 items-center justify-between border-b border-deep-teal bg-deep-teal px-6 text-white md:flex">
        <div className="flex items-center gap-4">
          <Logo onTeal />

          <nav className="flex items-center gap-1" aria-label="Primary">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                    active
                      ? "bg-white/20 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Link
            to="/settings"
            aria-label="Settings"
            className="rounded-full bg-white/15 p-2 text-white hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <SessionMiniBar />

      <main className="md:pt-16 md:pb-8 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <div className={`mx-auto px-4 py-6 md:py-10 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Primary"
      >
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 py-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// Silence unused imports for tree-shaking safety in strict builds
void useSuspenseQuery;
void useServerFn;
void getActiveSession;
