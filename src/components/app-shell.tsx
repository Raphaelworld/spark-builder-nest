import { Link, useRouterState } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Home, CalendarDays, Target, LineChart, User, Moon, Sun, Timer } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getActiveSession } from "@/lib/sessions.functions";
import { activeSessionQueryOptions } from "@/lib/session-queries";
import { remainingMs, type SessionTimerFields } from "@/lib/techniques";

const NAV = [
  { to: "/today", label: "Today", icon: Home },
  { to: "/planner", label: "Planner", icon: CalendarDays },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/insights", label: "Insights", icon: LineChart },
] as const;

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("gobez-theme");
    const prefers =
      stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(prefers);
    document.documentElement.classList.toggle("dark", prefers);
  }, []);
  const toggle = () => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("gobez-theme", next ? "dark" : "light");
      return next;
    });
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

function Logo() {
  return (
    <Link to="/today" className="flex items-center gap-2">
      <span className="font-serif text-2xl text-primary">G</span>
      <span className="font-serif text-xl text-foreground">Gobez</span>
    </Link>
  );
}

export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { dark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile top header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Link
            to="/settings"
            aria-label="Settings"
            className="rounded-full bg-primary/10 p-2 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Desktop top navigation */}
      <header className="fixed inset-x-0 top-0 z-30 hidden h-16 items-center justify-between border-b border-border bg-background/90 px-6 backdrop-blur md:flex">
        <Logo />

        <nav
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1"
          aria-label="Primary"
        >
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Link
            to="/settings"
            aria-label="Settings"
            className="rounded-full bg-primary/10 p-2 text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
