export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "gobez-theme";
const CHANGE_EVENT = "gobez-theme-change";

export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // storage unavailable
  }
  return "system";
}

export function resolveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref !== "system") return pref;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(pref: ThemePreference) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveTheme(pref) === "dark");
}

export function setThemePreference(pref: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // storage unavailable — still apply for this visit
  }
  applyTheme(pref);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/** Subscribe to preference changes (from any screen) and OS theme changes. */
export function onThemeChange(cb: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => {
    if (getThemePreference() === "system") {
      applyTheme("system");
      cb();
    }
  };
  window.addEventListener(CHANGE_EVENT, cb);
  media.addEventListener("change", onMedia);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    media.removeEventListener("change", onMedia);
  };
}
