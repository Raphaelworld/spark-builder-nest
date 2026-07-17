import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { parsePlan } from "@/lib/planner-parse";
import { DAYS, fmt } from "./constants";
import { TECHNIQUES } from "@/lib/techniques";
import { Sparkles } from "lucide-react";

export function PlannerPalette({
  open,
  onOpenChange,
  goals,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goals: Array<{ id: string; title: string; color: string; status: string }>;
  onSubmit: (v: {
    title: string;
    goal_id: string | null;
    day_of_week: number;
    start_minute: number;
    planned_minutes: number;
    technique: "pomodoro" | "deep_work" | "active_recall";
  }) => void;
}) {
  const [value, setValue] = useState("");
  useEffect(() => {
    if (!open) setValue("");
  }, [open]);

  const parsed = parsePlan(value, goals.filter((g) => g.status === "active"));
  const goalTitle = parsed?.goal_id
    ? goals.find((g) => g.id === parsed.goal_id)?.title
    : null;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={value}
        onValueChange={setValue}
        placeholder="Plan calc review Tue 9am 50m deep work…"
      />
      <CommandList>
        {!value && (
          <CommandEmpty>Type a plan in plain English. Try &quot;Plan writing tomorrow 4pm 45m&quot;.</CommandEmpty>
        )}
        {value && !parsed && <CommandEmpty>Couldn&apos;t parse — add a day and time.</CommandEmpty>}
        {parsed && (
          <CommandGroup heading="Preview">
            <CommandItem
              value="__submit__"
              onSelect={() => {
                onSubmit(parsed);
                onOpenChange(false);
              }}
              className="flex-col items-start gap-1"
            >
              <div className="flex w-full items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium">{parsed.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {DAYS[parsed.day_of_week]} · {fmt(parsed.start_minute)} ·{" "}
                {parsed.planned_minutes}m · {TECHNIQUES[parsed.technique].name}
                {goalTitle ? ` · ${goalTitle}` : ""}
              </span>
              <span className="mt-1 text-[10px] text-muted-foreground">
                Enter to add
              </span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
