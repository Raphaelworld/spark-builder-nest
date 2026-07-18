import { useEffect, useRef, useState, useMemo } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { Play, Trash2, Copy, ArrowRight } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  DAYS,
  END_HOUR,
  PX_PER_MIN,
  ROW_MINUTES,
  ROW_PX,
  START_HOUR,
  SNAP_MIN,
  TOTAL_MINUTES,
  TOTAL_ROWS,
  clamp,
  colorFor,
  fmt,
  jsDayToIdx,
  minutesFromTop,
  snap,
  topFromMinutes,
  type TechniqueId,
} from "./constants";

export type PlannedBlock = {
  id: string;
  title: string;
  goal_id: string | null;
  day_of_week: number;
  start_minute: number;
  planned_minutes: number;
  technique: string;
};

type Goal = { id: string; title: string; color: string; status: string };

type GhostState = { day: number; startMin: number; endMin: number } | null;

export function WeekGrid({
  blocks,
  goals,
  onCreateAtSlot,
  onOpenBlock,
  onStartBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onMoveBlock,
  onResizeBlock,
}: {
  blocks: PlannedBlock[];
  goals: Goal[];
  onCreateAtSlot: (day: number, startMin: number, endMin: number) => void;
  onOpenBlock: (b: PlannedBlock) => void;
  onStartBlock: (b: PlannedBlock) => void;
  onDuplicateBlock: (b: PlannedBlock) => void;
  onDeleteBlock: (id: string) => void;
  onMoveBlock: (id: string, day: number, startMin: number) => void;
  onResizeBlock: (id: string, plannedMinutes: number) => void;
}) {
  const todayIdx = jsDayToIdx(new Date().getDay());
  const perDayTotals = useMemo(() => {
    const totals = Array(7).fill(0);
    for (const b of blocks) totals[b.day_of_week] += b.planned_minutes;
    return totals;
  }, [blocks]);

  // "Now" indicator (updates every 60s)
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  const showNowLine = nowMin >= START_HOUR * 60 && nowMin <= END_HOUR * 60;

  // Auto-scroll to now on mount
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showNowLine || !scrollerRef.current) return;
    const y = topFromMinutes(nowMin) - 120;
    scrollerRef.current.scrollTo({ top: Math.max(0, y) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={scrollerRef} className="overflow-x-auto rounded-2xl border border-border bg-card">
      <div className="min-w-[720px]">
        {/* Day headers */}
        <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-border">
          <div />
          {DAYS.map((d, i) => (
            <div
              key={d}
              className={`flex flex-col items-center px-2 py-2 text-xs ${
                i === todayIdx ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="font-semibold">{d}</span>
              <span className="text-[10px] opacity-70">
                {perDayTotals[i] > 0 ? `${perDayTotals[i]}m` : "—"}
              </span>
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div className="relative grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
          {/* time labels */}
          <div>
            {Array.from({ length: END_HOUR - START_HOUR }).map((_, h) => (
              <div
                key={h}
                style={{ height: ROW_PX * 2 }}
                className="border-b border-border pr-1 pt-0.5 text-right text-[10px] text-muted-foreground"
              >
                {fmt((START_HOUR + h) * 60)}
              </div>
            ))}
          </div>

          {DAYS.map((_, dayIdx) => (
            <DayColumn
              key={dayIdx}
              dayIdx={dayIdx}
              isToday={dayIdx === todayIdx}
              nowMin={showNowLine && dayIdx === todayIdx ? nowMin : null}
              blocks={blocks.filter((b) => b.day_of_week === dayIdx)}
              goals={goals}
              onCreateAtSlot={onCreateAtSlot}
              onOpenBlock={onOpenBlock}
              onStartBlock={onStartBlock}
              onDuplicateBlock={onDuplicateBlock}
              onDeleteBlock={onDeleteBlock}
              onResizeBlock={onResizeBlock}
              onMoveBlock={onMoveBlock}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  dayIdx,
  isToday,
  nowMin,
  blocks,
  goals,
  onCreateAtSlot,
  onOpenBlock,
  onStartBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onResizeBlock,
  onMoveBlock,
}: {
  dayIdx: number;
  isToday: boolean;
  nowMin: number | null;
  blocks: PlannedBlock[];
  goals: Goal[];
  onCreateAtSlot: (day: number, startMin: number, endMin: number) => void;
  onOpenBlock: (b: PlannedBlock) => void;
  onStartBlock: (b: PlannedBlock) => void;
  onDuplicateBlock: (b: PlannedBlock) => void;
  onDeleteBlock: (id: string) => void;
  onResizeBlock: (id: string, plannedMinutes: number) => void;
  onMoveBlock: (id: string, day: number, startMin: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${dayIdx}`,
    data: { kind: "day", dayIdx },
  });
  const columnRef = useRef<HTMLDivElement | null>(null);
  const setRefs = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    columnRef.current = el;
  };

  const [ghost, setGhost] = useState<GhostState>(null);
  const dragStateRef = useRef<{ startMin: number } | null>(null);

  function pointerToMinute(clientY: number): number {
    const rect = columnRef.current!.getBoundingClientRect();
    const y = clamp(clientY - rect.top, 0, TOTAL_ROWS * ROW_PX);
    return snap(minutesFromTop(y));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Only left/primary button, not on a block
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-planner-block]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const startMin = pointerToMinute(e.clientY);
    dragStateRef.current = { startMin };
    setGhost({ day: dayIdx, startMin, endMin: startMin + SNAP_MIN });
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStateRef.current) return;
    const cur = pointerToMinute(e.clientY);
    const start = Math.min(dragStateRef.current.startMin, cur);
    const end = Math.max(dragStateRef.current.startMin + SNAP_MIN, cur);
    setGhost({ day: dayIdx, startMin: start, endMin: end });
  }

  function onPointerUp() {
    if (!ghost || !dragStateRef.current) {
      dragStateRef.current = null;
      return;
    }
    const duration = Math.max(SNAP_MIN, ghost.endMin - ghost.startMin);
    onCreateAtSlot(dayIdx, ghost.startMin, ghost.startMin + duration);
    dragStateRef.current = null;
    setGhost(null);
  }

  return (
    <div
      ref={setRefs}
      className={`relative border-l border-border transition-colors ${
        isOver ? "bg-primary/5" : ""
      } ${isToday ? "bg-accent/20" : ""}`}
      style={{ height: ROW_PX * TOTAL_ROWS }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragStateRef.current = null;
        setGhost(null);
      }}
    >
      {/* row grid lines */}
      {Array.from({ length: TOTAL_ROWS }).map((_, r) => (
        <div
          key={r}
          className={`border-b ${r % 2 === 1 ? "border-border/70" : "border-border/30"}`}
          style={{ height: ROW_PX }}
        />
      ))}

      {/* ghost while drag-creating */}
      {ghost && (
        <div
          className="pointer-events-none absolute inset-x-1 rounded-md border-2 border-dashed border-primary/60 bg-primary/10"
          style={{
            top: topFromMinutes(ghost.startMin),
            height: (ghost.endMin - ghost.startMin) * PX_PER_MIN,
          }}
        >
          <span className="ml-1 text-[10px] text-primary">
            {fmt(ghost.startMin)} – {fmt(ghost.endMin)}
          </span>
        </div>
      )}

      {/* now line */}
      {nowMin != null && (
        <div
          className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
          style={{ top: topFromMinutes(nowMin) - 1 }}
        >
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="h-px flex-1 bg-primary" />
        </div>
      )}

      {/* blocks */}
      {blocks.map((b) => (
        <BlockView
          key={b.id}
          block={b}
          goal={goals.find((g) => g.id === b.goal_id)}
          onOpen={() => onOpenBlock(b)}
          onStart={() => onStartBlock(b)}
          onDuplicate={() => onDuplicateBlock(b)}
          onDelete={() => onDeleteBlock(b.id)}
          onResize={(mins) => onResizeBlock(b.id, mins)}
          onMove={(day, start) => onMoveBlock(b.id, day, start)}
        />
      ))}
    </div>
  );
}

function BlockView({
  block,
  goal,
  onOpen,
  onStart,
  onDuplicate,
  onDelete,
  onResize,
}: {
  block: PlannedBlock;
  goal?: Goal;
  onOpen: () => void;
  onStart: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onResize: (plannedMinutes: number) => void;
  onMove: (day: number, startMin: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block:${block.id}`,
    data: { kind: "block", block },
  });

  const [resizeDelta, setResizeDelta] = useState(0);
  const resizeStartRef = useRef<{ y: number; mins: number } | null>(null);

  function onResizeDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeStartRef.current = { y: e.clientY, mins: block.planned_minutes };
    setResizeDelta(0);
  }
  function onResizeMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!resizeStartRef.current) return;
    const dy = e.clientY - resizeStartRef.current.y;
    const dMins = snap(dy / PX_PER_MIN);
    setResizeDelta(dMins);
  }
  function onResizeUp() {
    if (!resizeStartRef.current) return;
    const next = clamp(resizeStartRef.current.mins + resizeDelta, 15, 240);
    if (next !== block.planned_minutes) onResize(next);
    resizeStartRef.current = null;
    setResizeDelta(0);
  }

  const top = topFromMinutes(block.start_minute);
  const height = Math.max(ROW_PX - 2, (block.planned_minutes + resizeDelta) * PX_PER_MIN - 2);
  const color = colorFor(goal?.color);
  const style: React.CSSProperties = {
    top,
    height,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 40 : 5,
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          layout
          data-planner-block
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          onDoubleClick={onOpen}
          className={`absolute inset-x-1 touch-none rounded-md border ${color.border} ${color.bg} p-1.5 text-[11px] shadow-sm transition-shadow hover:shadow-md ${
            isDragging ? "opacity-80 shadow-lg" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-1">
            <p className="line-clamp-2 font-medium text-foreground">{block.title}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Start session"
              className="rounded p-0.5 text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Play className="h-3 w-3" />
            </button>
          </div>
          {goal && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${color.dot}`} />
              {goal.title}
            </p>
          )}
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {fmt(block.start_minute)} · {block.planned_minutes + resizeDelta}m
          </p>
          {/* resize handle */}
          <div
            onPointerDown={onResizeDown}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
            className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize touch-none rounded-b-md hover:bg-primary/30"
            aria-label="Resize"
          />
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onStart}>
          <Play className="mr-2 h-4 w-4" /> Start session
        </ContextMenuItem>
        <ContextMenuItem onClick={onOpen}>
          <ArrowRight className="mr-2 h-4 w-4" /> Edit
        </ContextMenuItem>
        <ContextMenuItem onClick={onDuplicate}>
          <Copy className="mr-2 h-4 w-4" /> Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Suppress unused import warnings for constants used in typing only.
void ROW_MINUTES;
void TOTAL_MINUTES;
