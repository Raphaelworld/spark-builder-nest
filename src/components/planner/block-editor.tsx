import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useIsMobile } from "@/hooks/use-mobile";
import { TECHNIQUES } from "@/lib/techniques";
import { DAYS, fmt, type TechniqueId } from "./constants";
import { Trash2 } from "lucide-react";

export type BlockEditorValue = {
  id?: string;
  title: string;
  goal_id: string | null;
  day_of_week: number;
  start_minute: number;
  planned_minutes: number;
  technique: TechniqueId;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: BlockEditorValue | null;
  goals: Array<{ id: string; title: string; color: string; status: string }>;
  onSubmit: (v: BlockEditorValue) => void;
  onDelete?: (id: string) => void;
  pending?: boolean;
  error?: string | null;
};

export function BlockEditor(props: Props) {
  const isMobile = useIsMobile();
  const Wrapper = isMobile ? MobileWrapper : DesktopWrapper;
  return <Wrapper {...props} />;
}

function DesktopWrapper(props: Props) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl">
            {props.value?.id ? "Edit block" : "Plan a block"}
          </SheetTitle>
          <SheetDescription>
            {props.value
              ? `${DAYS[props.value.day_of_week]} · ${fmt(props.value.start_minute)}`
              : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <EditorForm {...props} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileWrapper(props: Props) {
  return (
    <Drawer open={props.open} onOpenChange={props.onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-serif text-2xl">
            {props.value?.id ? "Edit block" : "Plan a block"}
          </DrawerTitle>
          <DrawerDescription>
            {props.value
              ? `${DAYS[props.value.day_of_week]} · ${fmt(props.value.start_minute)}`
              : ""}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6">
          <EditorForm {...props} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function EditorForm({ value, goals, onSubmit, onDelete, pending, error, onOpenChange }: Props) {
  const [title, setTitle] = useState(value?.title ?? "");
  const [goalId, setGoalId] = useState<string | "">(value?.goal_id ?? "");
  const [technique, setTechnique] = useState<TechniqueId>(value?.technique ?? "pomodoro");
  const [minutes, setMinutes] = useState(
    value?.planned_minutes ?? TECHNIQUES.pomodoro.defaultMinutes,
  );
  const activeGoals = goals.filter((g) => g.status === "active");

  useEffect(() => {
    if (!value) return;
    setTitle(value.title ?? "");
    setGoalId(value.goal_id ?? "");
    setTechnique(value.technique);
    setMinutes(value.planned_minutes);
  }, [value?.id, value?.day_of_week, value?.start_minute]);

  if (!value) return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({
          ...value,
          title: title.trim(),
          goal_id: goalId || null,
          planned_minutes: minutes,
          technique,
        });
      }}
      className="space-y-5 pt-2"
    >
      <div>
        <Label htmlFor="block-title" className="mb-1.5 block">
          What are you focusing on?
        </Label>
        <Input
          id="block-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Problem set 4"
          maxLength={120}
        />
      </div>

      {activeGoals.length > 0 && (
        <div>
          <Label className="mb-1.5 block">Goal (optional)</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGoalId("")}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                !goalId
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:bg-accent"
              }`}
            >
              None
            </button>
            {activeGoals.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoalId(g.id)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  goalId === g.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                {g.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label className="mb-1.5 block">Technique</Label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(TECHNIQUES).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTechnique(t.id);
                setMinutes(t.defaultMinutes);
              }}
              className={`rounded-lg border px-2 py-2 text-xs transition ${
                technique === t.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:bg-accent"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <Label>Duration</Label>
          <span className="text-sm text-muted-foreground">{minutes} min</span>
        </div>
        <Slider
          value={[minutes]}
          min={15}
          max={120}
          step={5}
          onValueChange={(v) => setMinutes(v[0])}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        {value.id && onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(value.id!)}
            aria-label="Delete block"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-[2]" disabled={!title.trim() || pending}>
          {pending ? "Saving…" : value.id ? "Save" : "Add to week"}
        </Button>
      </div>
    </form>
  );
}
