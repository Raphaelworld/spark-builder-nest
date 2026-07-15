import { Link, useRouterState } from "@tanstack/react-router";
import { Home, CalendarDays, Target, LineChart, User, Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const NAV = [
  { to: "/", label: "Today", icon: Home },
  { to: "/planner", label: "Planner", icon: CalendarDays },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/insights", label: "Insights", icon: LineChart },
] as const;

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("gobez-theme");
    const prefers =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
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

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { dark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col border-r border-border bg-sidebar px-2 py-6 md:flex">
        <Link to="/" className="mb-8 flex items-center justify-center">
          <span className="font-serif text-2xl text-primary">G</span>
        </Link>
        <nav className="flex flex-1 flex-col items-center gap-2" aria-label="Primary">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex w-full flex-col items-center gap-1 rounded-lg px-2 py-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-2">
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
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/" className="font-serif text-xl text-primary">
          Gobez
        </Link>
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

      {/* Content */}
      <main className="md:pl-20 pb-24 md:pb-8">
        <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur md:hidden"
        aria-label="Primary"
      >
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
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
