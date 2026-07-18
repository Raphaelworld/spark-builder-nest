import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const ITEMS = [
  { id: "phone", label: "Phone out of reach" },
  { id: "tabs", label: "Stray tabs closed" },
  { id: "water", label: "Water nearby" },
  { id: "materials", label: "Materials at hand" },
] as const;

const STORAGE_KEY = "gobez-preflight";

type PreflightState = { open: boolean; checked: string[] };

function load(): PreflightState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PreflightState;
  } catch {
    // fall through to default
  }
  return { open: false, checked: [] };
}

/**
 * Pre-flight checklist (PRD §4.1): optional toggle list in session setup,
 * collapsed by default, remembers your setup between sessions.
 */
export function PreflightChecklist() {
  const [state, setState] = useState<PreflightState>({ open: false, checked: [] });

  useEffect(() => {
    setState(load());
  }, []);

  const persist = (next: PreflightState) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — checklist still works for this visit
    }
  };

  const toggleItem = (id: string) => {
    const checked = state.checked.includes(id)
      ? state.checked.filter((c) => c !== id)
      : [...state.checked, id];
    persist({ ...state, checked });
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => persist({ ...state, open: !state.open })}
        aria-expanded={state.open}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>
          Set up your space{" "}
          <span className="font-normal text-muted-foreground">
            ({state.checked.length}/{ITEMS.length})
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${state.open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {state.open && (
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          {ITEMS.map((item) => {
            const on = state.checked.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleItem(item.id)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  on
                    ? "border-success bg-success/15 text-foreground"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
