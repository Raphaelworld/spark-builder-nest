import type { TechniqueId } from "./techniques";
import { TECHNIQUES } from "./techniques";

type TodaySummary = {
  streak: number;
  todayMinutes: number;
  completedCount: number;
  lastNote: string | null;
  recentTasks: string[];
};

type Insights = {
  totals: {
    minutes: number;
    sessions: number;
    abandoned: number;
    avgFocus: number;
    completionRate: number;
  };
  bestHour: number;
  weekly: { lastWeekMinutes: number; prevWeekMinutes: number; deltaPct: number };
  topDidnt: { tag: string; count: number }[];
  byTechnique: { technique: string; minutes: number; sessions: number }[];
};

export type CoachNudge = {
  id: string;
  tone: "encourage" | "info" | "warn" | "celebrate";
  title: string;
  body: string;
  action?: { label: string; to: string };
  priority: number; // higher = more important
};

const TONE_VOICE = {
  gentle: {
    greeting: (n: string) => `Hey ${n},`,
    startCue: "A small start counts — 20 quiet minutes is plenty.",
    streakSave: "The streak's still yours — a short session tonight keeps it alive.",
    abandonNote: "A few sessions slipped lately. That's okay — try a shorter block next.",
  },
  direct: {
    greeting: (n: string) => `${n} —`,
    startCue: "Pick one thing. Start now. Momentum follows.",
    streakSave: "Streak at risk. One session before bed keeps it.",
    abandonNote: "You've been abandoning sessions. Shorten the block and finish it.",
  },
  playful: {
    greeting: (n: string) => `Alright ${n},`,
    startCue: "One tiny focus sprint? Your future self will high-five you.",
    streakSave: "Streak's blinking at you 👀 — a quick session and it lives.",
    abandonNote: "A few runaway sessions this week. Let's tame one small block.",
  },
};

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export function computeCoachNudges({
  profile,
  today,
  insights,
  activeSession,
}: {
  profile: { display_name: string | null; coach_tone: string } | null;
  today: TodaySummary | undefined;
  insights: Insights | undefined;
  activeSession: unknown;
}): CoachNudge[] {
  const nudges: CoachNudge[] = [];
  const tone = (profile?.coach_tone ?? "gentle") as keyof typeof TONE_VOICE;
  const voice = TONE_VOICE[tone] ?? TONE_VOICE.gentle;
  const name = (profile?.display_name?.split(" ")[0] ?? "friend").trim() || "friend";
  const now = new Date();
  const hour = now.getHours();

  // 1. Session in progress — no nudge, keep the focus screen clean
  if (activeSession) return [];

  // 2. Big streak celebration
  if ((today?.streak ?? 0) >= 3) {
    nudges.push({
      id: "streak-celebrate",
      tone: "celebrate",
      title: `${today!.streak}-day streak`,
      body: `${voice.greeting(name)} you've focused ${today!.streak} days in a row. Keep the rhythm gentle and real.`,
      priority: 60,
    });
  }

  // 3. No session yet today, evening
  if ((today?.todayMinutes ?? 0) === 0 && hour >= 17 && (today?.streak ?? 0) >= 1) {
    nudges.push({
      id: "streak-save",
      tone: "warn",
      title: "Streak at risk",
      body: voice.streakSave,
      action: { label: "Start a short session", to: "/session" },
      priority: 95,
    });
  }

  // 4. First session of the day
  if ((today?.todayMinutes ?? 0) === 0 && hour < 17) {
    nudges.push({
      id: "day-start",
      tone: "encourage",
      title: "Fresh page",
      body: `${voice.greeting(name)} ${voice.startCue}`,
      action: { label: "Begin", to: "/session" },
      priority: 70,
    });
  }

  // 5. Best-hour insight
  if (insights && insights.totals.sessions >= 5) {
    const bestStart = insights.bestHour;
    const bestEnd = (insights.bestHour + 3) % 24;
    if (hour >= bestStart && hour < ((bestStart + 3) % 24) + (bestStart + 3 >= 24 ? 24 : 0)) {
      nudges.push({
        id: "best-hour-now",
        tone: "info",
        title: "You're in your window",
        body: `${formatHour(bestStart)}–${formatHour(bestEnd)} is when you focus best. Ride it.`,
        action: { label: "Start a session", to: "/session" },
        priority: 85,
      });
    } else {
      nudges.push({
        id: "best-hour-hint",
        tone: "info",
        title: "Your prime window",
        body: `You've logged the most focus around ${formatHour(bestStart)}–${formatHour(bestEnd)}. Worth guarding.`,
        priority: 30,
      });
    }
  }

  // 6. Abandon pattern
  if (insights && insights.totals.abandoned >= 3 && insights.totals.completionRate < 60) {
    nudges.push({
      id: "abandon-pattern",
      tone: "warn",
      title: "Try a shorter block",
      body: `${voice.abandonNote} Your completion rate is ${insights.totals.completionRate}%.`,
      action: { label: "Start a 15-min session", to: "/session" },
      priority: 80,
    });
  }

  // 7. Weekly delta
  if (insights && insights.weekly.prevWeekMinutes > 0) {
    if (insights.weekly.deltaPct >= 25) {
      nudges.push({
        id: "week-up",
        tone: "celebrate",
        title: `Up ${insights.weekly.deltaPct}% this week`,
        body: `${insights.weekly.lastWeekMinutes} focus minutes vs ${insights.weekly.prevWeekMinutes} last week. Lovely trend.`,
        priority: 50,
      });
    } else if (insights.weekly.deltaPct <= -25) {
      nudges.push({
        id: "week-down",
        tone: "info",
        title: "Softer week",
        body: `${insights.weekly.lastWeekMinutes} min this week vs ${insights.weekly.prevWeekMinutes} last week. What changed?`,
        action: { label: "Review insights", to: "/insights" },
        priority: 55,
      });
    }
  }

  // 8. Recurring "didn't" tag
  const topDidnt = insights?.topDidnt[0];
  if (topDidnt && topDidnt.count >= 3) {
    nudges.push({
      id: `didnt-${topDidnt.tag}`,
      tone: "info",
      title: `"${topDidnt.tag}" keeps coming up`,
      body: `You've tagged this ${topDidnt.count} times in your wrap-ups. Worth a small experiment this session.`,
      priority: 45,
    });
  }

  // 9. Try another technique
  if (insights && insights.byTechnique.length >= 1 && insights.totals.sessions >= 8) {
    const used = new Set(insights.byTechnique.map((t) => t.technique));
    const untried = (Object.keys(TECHNIQUES) as TechniqueId[]).find((t) => !used.has(t));
    if (untried) {
      nudges.push({
        id: `try-${untried}`,
        tone: "info",
        title: `Try ${TECHNIQUES[untried].name}`,
        body: `You haven't tried ${TECHNIQUES[untried].name} yet — ${TECHNIQUES[untried].hint.toLowerCase()}.`,
        priority: 25,
      });
    }
  }

  // 10. Last-note callback
  if (today?.lastNote) {
    nudges.push({
      id: "last-note",
      tone: "info",
      title: "Note to future you",
      body: `Last time you said: "${today.lastNote}"`,
      priority: 20,
    });
  }

  return nudges.sort((a, b) => b.priority - a.priority);
}
