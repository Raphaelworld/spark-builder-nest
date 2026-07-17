import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useHotkeys } from "react-hotkeys-hook";
import { Download, Plus, Command as CommandIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  goalsQueryOptions,
  plannedBlocksQueryOptions,
  unscheduledTasksQueryOptions,
} from "@/lib/planner-queries";
import {
  createPlannedBlock,
  deletePlannedBlock,
  updatePlannedBlock,
} from "@/lib/planner.functions";
import {
  createUnscheduledTask,
  deleteUnscheduledTask,
} from "@/lib/unscheduled.functions";
import { logEvent } from "@/lib/events.functions";
import { WeekGrid, type PlannedBlock } from "@/components/planner/week-grid";
import { TaskTray } from "@/components/planner/task-tray";
import { BlockEditor, type BlockEditorValue } from "@/components/planner/block-editor";
import { PlannerPalette } from "@/components/planner/planner-palette";
import {
  DAYS,
  PX_PER_MIN,
  SNAP_MIN,
  START_HOUR,
  TOTAL_MINUTES,
  clamp,
  jsDayToIdx,
  snap,
  type TechniqueId,
} from "@/components/planner/constants";

export const Route = createFileRoute("/_authenticated/planner")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(plannedBlocksQueryOptions());
    context.queryClient.ensureQueryData(goalsQueryOptions());
    context.queryClient.ensureQueryData(unscheduledTasksQueryOptions());
  },
  head: () => ({
    meta: [
      { title: "Planner — Gobez" },
      {
        name: "description",
        content: "Drag focus blocks onto your week, capture intents, and start sessions from your plan.",
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <AppShell>
      <p role="alert" className="text-destructive">{error.message}</p>
    </AppShell>
  ),
  component: PlannerPage,
});

function PlannerPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: blocks = [] } = useQuery(plannedBlocksQueryOptions());
  const { data: goals = [] } = useQuery(goalsQueryOptions());
  const { data: tasks = [] } = useQuery(unscheduledTasksQueryOptions());

  const [editor, setEditor] = useState<{ open: boolean; value: BlockEditorValue | null }>({
    open: false,
    value: null,
  });
  const [paletteOpen, setPaletteOpen] = useState(false);

  const createFn = useServerFn(createPlannedBlock);
  const updateFn = useServerFn(updatePlannedBlock);
  const deleteFn = useServerFn(deletePlannedBlock);
  const createTaskFn = useServerFn(createUnscheduledTask);
  const deleteTaskFn = useServerFn(deleteUnscheduledTask);
  const logFn = useServerFn(logEvent);

  function track(name: string, meta?: Record<string, unknown>) {
    logFn({ data: { name, payload: meta ?? {} } }).catch(() => {});
  }

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["plannedBlocks"] });
    qc.invalidateQueries({ queryKey: ["unscheduledTasks"] });
  };

  const createMut = useMutation({
    mutationFn: (v: BlockEditorValue) =>
      createFn({
        data: {
          title: v.title,
          goal_id: v.goal_id,
          day_of_week: v.day_of_week,
          start_minute: v.start_minute,
          end_minute: v.start_minute + v.planned_minutes,
          planned_minutes: v.planned_minutes,
          technique: v.technique,
        },
      }),
    onSuccess: () => {
      invalidateAll();
      setEditor({ open: false, value: null });
    },
  });

  const updateMut = useMutation({
    mutationFn: (v: { id: string; patch: Partial<Omit<BlockEditorValue, "id">> & { end_minute?: number } }) =>
      updateFn({ data: v as never }),
    // optimistic update
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["plannedBlocks"] });
      const prev = qc.getQueryData<PlannedBlock[]>(["plannedBlocks"]);
      qc.setQueryData<PlannedBlock[]>(["plannedBlocks"], (list) =>
        (list ?? []).map((b) => (b.id === v.id ? { ...b, ...v.patch } as PlannedBlock : b)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["plannedBlocks"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["plannedBlocks"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: invalidateAll,
  });

  const createTaskMut = useMutation({
    mutationFn: (v: { title: string; technique: TechniqueId; planned_minutes: number }) =>
      createTaskFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["unscheduledTasks"] }),
  });
  const deleteTaskMut = useMutation({
    mutationFn: (id: string) => deleteTaskFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["unscheduledTasks"] }),
  });

  const totalPlanned = useMemo(
    () => blocks.reduce((s, b) => s + b.planned_minutes, 0),
    [blocks],
  );

  // Sensors: small distance so click-open still works and pointer down on empty grid does not begin block drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over, delta } = event;
    if (!over) return;
    const overData = over.data.current as { kind: string; dayIdx: number } | undefined;
    if (overData?.kind !== "day") return;
    const activeData = active.data.current as
      | { kind: "block"; block: PlannedBlock }
      | { kind: "task"; task: { id: string; title: string; goal_id: string | null; technique: string; planned_minutes: number } }
      | undefined;
    if (!activeData) return;

    const targetDay = overData.dayIdx;

    if (activeData.kind === "block") {
      const b = activeData.block;
      const newStart = clamp(
        snap(b.start_minute + delta.y / PX_PER_MIN),
        0,
        START_HOUR * 60 + TOTAL_MINUTES - b.planned_minutes,
      );
      if (newStart === b.start_minute && targetDay === b.day_of_week) return;
      updateMut.mutate({
        id: b.id,
        patch: {
          day_of_week: targetDay,
          start_minute: newStart,
          end_minute: newStart + b.planned_minutes,
        },
      });
      track("planner_block_moved");
      return;
    }

    if (activeData.kind === "task") {
      const t = activeData.task;
      // Compute drop y relative to column
      const activeRect = active.rect.current.translated;
      const overRect = over.rect;
      let startMin = START_HOUR * 60;
      if (activeRect && overRect) {
        const relY = activeRect.top - overRect.top;
        startMin = clamp(
          snap(START_HOUR * 60 + relY / PX_PER_MIN),
          START_HOUR * 60,
          START_HOUR * 60 + TOTAL_MINUTES - t.planned_minutes,
        );
      }
      // Create block and remove task
      createFn({
        data: {
          title: t.title,
          goal_id: t.goal_id,
          day_of_week: targetDay,
          start_minute: startMin,
          end_minute: startMin + t.planned_minutes,
          planned_minutes: t.planned_minutes,
          technique: t.technique as TechniqueId,
        },
      }).then(() => {
        deleteTaskFn({ data: { id: t.id } }).finally(() => {
          invalidateAll();
        });
      });
      track("planner_tray_task_placed");
    }
  }

  function openCreate(day: number, startMin: number, endMin: number) {
    const duration = Math.max(SNAP_MIN, endMin - startMin);
    setEditor({
      open: true,
      value: {
        title: "",
        goal_id: null,
        day_of_week: day,
        start_minute: startMin,
        planned_minutes: duration,
        technique: "pomodoro",
      },
    });
  }

  function openEdit(b: PlannedBlock) {
    setEditor({
      open: true,
      value: {
        id: b.id,
        title: b.title,
        goal_id: b.goal_id,
        day_of_week: b.day_of_week,
        start_minute: b.start_minute,
        planned_minutes: b.planned_minutes,
        technique: b.technique as TechniqueId,
      },
    });
  }

  function startBlock(b: PlannedBlock) {
    track("planner_block_started");
    navigate({
      to: "/session",
      search: {
        task: b.title,
        technique: b.technique as TechniqueId,
        minutes: b.planned_minutes,
        goal_id: b.goal_id ?? undefined,
      } as never,
    });
  }

  function duplicateBlock(b: PlannedBlock) {
    const newStart = Math.min(
      START_HOUR * 60 + TOTAL_MINUTES - b.planned_minutes,
      b.start_minute + b.planned_minutes,
    );
    createFn({
      data: {
        title: b.title,
        goal_id: b.goal_id,
        day_of_week: b.day_of_week,
        start_minute: newStart,
        end_minute: newStart + b.planned_minutes,
        planned_minutes: b.planned_minutes,
        technique: b.technique as TechniqueId,
      },
    }).finally(invalidateAll);
    track("planner_block_created", { source: "duplicate" });
  }

  function exportIcs() {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gobez//Planner//EN"];
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - jsDayToIdx(now.getDay()));
    monday.setHours(0, 0, 0, 0);
    for (const b of blocks) {
      const start = new Date(monday);
      start.setDate(monday.getDate() + b.day_of_week);
      start.setMinutes(b.start_minute);
      const end = new Date(start);
      end.setMinutes(start.getMinutes() + b.planned_minutes);
      const fmtDt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      lines.push(
        "BEGIN:VEVENT",
        `UID:${b.id}@gobez`,
        `DTSTAMP:${fmtDt(now)}`,
        `DTSTART:${fmtDt(start)}`,
        `DTEND:${fmtDt(end)}`,
        `SUMMARY:${b.title.replace(/[,;\n]/g, " ")}`,
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gobez-week.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Hotkeys
  useHotkeys("mod+k", (e) => {
    e.preventDefault();
    setPaletteOpen(true);
    track("planner_palette_opened");
  });
  useHotkeys("n", () => {
    const d = new Date();
    openCreate(
      jsDayToIdx(d.getDay()),
      snap(d.getHours() * 60 + d.getMinutes()),
      snap(d.getHours() * 60 + d.getMinutes()) + 25,
    );
  }, { enableOnFormTags: false });

  return (
    <AppShell wide>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="space-y-5">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl">Planner</h1>
              <p className="text-sm text-muted-foreground">
                Drag to plan. Drop tasks from the tray. Press{" "}
                <kbd className="rounded border border-border bg-muted px-1 text-[10px]">⌘K</kbd> for quick add.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{totalPlanned} min planned</span>
              <Button variant="outline" size="sm" onClick={() => setPaletteOpen(true)}>
                <CommandIcon className="mr-1.5 h-3.5 w-3.5" />Quick add
              </Button>
              <Button variant="outline" size="sm" onClick={exportIcs} disabled={blocks.length === 0}>
                <Download className="mr-1.5 h-3.5 w-3.5" />Export
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const d = new Date();
                  const now = snap(d.getHours() * 60 + d.getMinutes());
                  openCreate(jsDayToIdx(d.getDay()), now, now + 25);
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />New block
              </Button>
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <TaskTray
              tasks={tasks}
              goals={goals}
              onCreate={(v) => {
                createTaskMut.mutate(v);
                track("planner_tray_task_created");
              }}
              onDelete={(id) => deleteTaskMut.mutate(id)}
            />

            <WeekGrid
              blocks={blocks as PlannedBlock[]}
              goals={goals}
              onCreateAtSlot={openCreate}
              onOpenBlock={openEdit}
              onStartBlock={startBlock}
              onDuplicateBlock={duplicateBlock}
              onDeleteBlock={(id) => deleteMut.mutate(id)}
              onMoveBlock={(id, day, startMin) => {
                const b = blocks.find((x) => x.id === id);
                if (!b) return;
                updateMut.mutate({
                  id,
                  patch: {
                    day_of_week: day,
                    start_minute: startMin,
                    end_minute: startMin + b.planned_minutes,
                  },
                });
              }}
              onResizeBlock={(id, plannedMinutes) => {
                const b = blocks.find((x) => x.id === id);
                if (!b) return;
                updateMut.mutate({
                  id,
                  patch: {
                    planned_minutes: plannedMinutes,
                    end_minute: b.start_minute + plannedMinutes,
                  },
                });
                track("planner_block_resized");
              }}
            />
          </div>
        </div>
      </DndContext>

      <BlockEditor
        open={editor.open}
        onOpenChange={(o) => setEditor((s) => ({ ...s, open: o }))}
        value={editor.value}
        goals={goals}
        pending={createMut.isPending || updateMut.isPending}
        error={
          createMut.error
            ? (createMut.error as Error).message
            : updateMut.error
              ? (updateMut.error as Error).message
              : null
        }
        onDelete={(id) => {
          deleteMut.mutate(id);
          setEditor({ open: false, value: null });
        }}
        onSubmit={(v) => {
          if (v.id) {
            updateMut.mutate({
              id: v.id,
              patch: {
                title: v.title,
                goal_id: v.goal_id,
                day_of_week: v.day_of_week,
                start_minute: v.start_minute,
                planned_minutes: v.planned_minutes,
                technique: v.technique,
                end_minute: v.start_minute + v.planned_minutes,
              },
            });
            setEditor({ open: false, value: null });
          } else {
            createMut.mutate(v);
            track("planner_block_created", { source: "editor" });
          }
        }}
      />

      <PlannerPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        goals={goals}
        onSubmit={(p) => {
          createFn({
            data: {
              title: p.title,
              goal_id: p.goal_id,
              day_of_week: p.day_of_week,
              start_minute: p.start_minute,
              end_minute: p.start_minute + p.planned_minutes,
              planned_minutes: p.planned_minutes,
              technique: p.technique,
            },
          }).finally(invalidateAll);
          track("planner_block_created", { source: "palette" });
        }}
      />
    </AppShell>
  );
}

// silence unused
void DAYS;
