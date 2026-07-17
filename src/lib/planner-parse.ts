import * as chrono from "chrono-node";
import type { TechniqueId } from "./techniques";

export type ParsedPlan = {
  title: string;
  day_of_week: number; // 0=Mon..6=Sun
  start_minute: number; // minutes since midnight
  planned_minutes: number;
  technique: TechniqueId;
  goal_id: string | null;
};

const TECH_KEYWORDS: Array<[RegExp, TechniqueId]> = [
  [/\b(deep\s*work|deep)\b/i, "deep_work"],
  [/\b(active\s*recall|recall|flashcards?)\b/i, "active_recall"],
  [/\b(pomodoro|pomo)\b/i, "pomodoro"],
];

function jsDayToIdx(d: number) {
  return (d + 6) % 7;
}

export function parsePlan(
  input: string,
  goals: Array<{ id: string; title: string }>,
): ParsedPlan | null {
  if (!input.trim()) return null;
  let text = input.replace(/^plan\s+/i, "").trim();

  // Technique
  let technique: TechniqueId = "pomodoro";
  for (const [re, id] of TECH_KEYWORDS) {
    if (re.test(text)) {
      technique = id;
      text = text.replace(re, "").trim();
      break;
    }
  }

  // Duration (e.g. 50m, 90 min, 1h)
  let planned_minutes = 25;
  const durMatch = text.match(/\b(\d+)\s*(h|hr|hrs|hour|hours|m|min|mins|minutes)\b/i);
  if (durMatch) {
    const n = Number(durMatch[1]);
    const unit = durMatch[2].toLowerCase();
    planned_minutes = unit.startsWith("h") ? n * 60 : n;
    text = text.replace(durMatch[0], "").trim();
  }

  // Date/time via chrono
  const ref = new Date();
  const results = chrono.parse(text, ref, { forwardDate: true });
  let dt = new Date();
  dt.setSeconds(0, 0);
  if (results.length) {
    dt = results[0].start.date();
    text = text.replace(results[0].text, "").trim();
  } else {
    // default: next full hour today
    dt.setHours(dt.getHours() + 1, 0, 0, 0);
  }
  const day_of_week = jsDayToIdx(dt.getDay());
  const start_minute = dt.getHours() * 60 + dt.getMinutes();

  // Goal — fuzzy match against titles
  let goal_id: string | null = null;
  for (const g of goals) {
    const short = g.title.split(/\s+/)[0];
    if (short && new RegExp(`\\b${short}\\b`, "i").test(text)) {
      goal_id = g.id;
      text = text.replace(new RegExp(`\\b${g.title}\\b`, "i"), "").trim();
      break;
    }
  }

  const title = text.replace(/\s{2,}/g, " ").trim() || "Focus block";
  return {
    title: title.slice(0, 120),
    day_of_week,
    start_minute: Math.max(0, Math.min(1439, Math.round(start_minute / 15) * 15)),
    planned_minutes: Math.max(5, Math.min(240, Math.round(planned_minutes / 5) * 5)),
    technique,
    goal_id,
  };
}
