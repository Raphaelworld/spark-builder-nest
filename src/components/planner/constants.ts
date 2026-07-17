export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const START_HOUR = 6;
export const END_HOUR = 22;
export const ROW_MINUTES = 30;
export const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
export const TOTAL_ROWS = TOTAL_MINUTES / ROW_MINUTES;
export const ROW_PX = 28; // per 30 min row
export const PX_PER_MIN = ROW_PX / ROW_MINUTES;
export const SNAP_MIN = 15;

export function fmt(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "pm" : "am";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")}${ampm}`;
}

export function jsDayToIdx(d: number) {
  return (d + 6) % 7;
}

export function snap(min: number, step = SNAP_MIN) {
  return Math.round(min / step) * step;
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function minutesFromTop(topPx: number) {
  return START_HOUR * 60 + topPx / PX_PER_MIN;
}

export function topFromMinutes(min: number) {
  return (min - START_HOUR * 60) * PX_PER_MIN;
}

export type TechniqueId = "pomodoro" | "deep_work" | "active_recall";

export const GOAL_COLOR_MAP: Record<string, { bg: string; border: string; dot: string }> = {
  terracotta: {
    bg: "bg-[oklch(0.72_0.14_45_/_0.15)]",
    border: "border-[oklch(0.55_0.16_38)]",
    dot: "bg-[oklch(0.55_0.16_38)]",
  },
  sage: {
    bg: "bg-[oklch(0.75_0.08_150_/_0.18)]",
    border: "border-[oklch(0.5_0.1_150)]",
    dot: "bg-[oklch(0.5_0.1_150)]",
  },
  ocean: {
    bg: "bg-[oklch(0.72_0.1_230_/_0.18)]",
    border: "border-[oklch(0.48_0.13_230)]",
    dot: "bg-[oklch(0.48_0.13_230)]",
  },
  gold: {
    bg: "bg-[oklch(0.82_0.13_85_/_0.22)]",
    border: "border-[oklch(0.6_0.14_75)]",
    dot: "bg-[oklch(0.6_0.14_75)]",
  },
  plum: {
    bg: "bg-[oklch(0.72_0.1_320_/_0.18)]",
    border: "border-[oklch(0.5_0.13_320)]",
    dot: "bg-[oklch(0.5_0.13_320)]",
  },
};

export function colorFor(color: string | null | undefined) {
  return GOAL_COLOR_MAP[color ?? "terracotta"] ?? GOAL_COLOR_MAP.terracotta;
}
