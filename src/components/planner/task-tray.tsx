import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TECHNIQUES } from "@/lib/techniques";
import { colorFor, type TechniqueId } from "./constants";

export type UnscheduledTask = {
  id: string;
  title: string;
  goal_id: string | null;
  technique: string;
  planned_minutes: number;
};

type Goal = { id: string; title: string; color: string; status: string };

export function TaskTray({
  tasks,
  goals,
  onCreate,
  onDelete,
}: {
  tasks: UnscheduledTask[];
  goals: Goal[];
  onCreate: (v: { title: string; technique: TechniqueId; planned_minutes: number }) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState("");

  return (
    <aside className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-serif text-lg">To Dos</h2>
        <span className="text-xs text-muted-foreground">Drag onto week</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onCreate({ title: title.trim(), technique: "pomodoro", planned_minutes: 25 });
          setTitle("");
        }}
        className="mb-3 flex gap-1.5"
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Capture a task…"
          maxLength={120}
          className="h-9 text-sm"
        />
        <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!title.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>
      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {tasks.length === 0 && (
            <motion.li
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground"
            >
              Capture study intents here, then drag them onto the week.
            </motion.li>
          )}
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} goals={goals} onDelete={onDelete} />
          ))}
        </AnimatePresence>
      </ul>
    </aside>
  );
}

function TaskCard({
  task,
  goals,
  onDelete,
}: {
  task: UnscheduledTask;
  goals: Goal[];
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task:${task.id}`,
    data: { kind: "task", task },
  });
  const goal = goals.find((g) => g.id === task.goal_id);
  const color = colorFor(goal?.color);
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 60 }
    : undefined;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 rounded-lg border ${color.border} ${color.bg} px-2 py-2 text-xs ${
        isDragging ? "shadow-lg" : "shadow-sm"
      }`}
    >
      <button
        {...listeners}
        {...attributes}
        aria-label={`Drag ${task.title}`}
        className="touch-none text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{task.title}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {TECHNIQUES[task.technique as TechniqueId]?.name ?? task.technique} · {task.planned_minutes}m
          {goal ? ` · ${goal.title}` : ""}
        </p>
      </div>
      <button
        onClick={() => onDelete(task.id)}
        aria-label="Delete task"
        className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.li>
  );
}
