# Planner refactor — Calendar-native

Turn `/planner` from a tap-to-open-modal grid into a real planning surface: drag to create, drag to move, resize from the edge, capture tasks in a side tray and drop them onto the week, and plan by keyboard through a command palette. The current warm editorial look (cream/ink/terracotta, DM Serif + DM Sans) stays; only interaction and layout change.

## What you'll be able to do

- **Drag on empty grid** to create a block sized to the drag distance; release opens a side Sheet (desktop) / bottom Drawer (mobile) pre-filled with day, start, duration.
- **Drag a block** to another day/time to reschedule. Snap to 15-min increments.
- **Resize a block** by dragging its bottom edge to change duration.
- **Right-click / long-press a block** for Start session, Duplicate, Move to next week, Delete.
- **Task tray** on the left: capture "unscheduled intents" (title + goal + technique + duration). Drag a card onto the grid to place it; it disappears from the tray.
- **Command palette (⌘K)**: type "Plan calc review Tue 9am 50m deep work" → block appears on grid with a soft animation.
- **Keyboard**: `n` new (opens Sheet at current time), `⌘K` palette, `Delete` removes selected block, `↑/↓` nudges start by 15m, `Shift+↑/↓` resizes.
- **Now-line** across today's column, auto-scrolls into view on load.
- **Per-day totals** in each day header; weekly total remains in the page header.
- **Goal color inheritance**: block background/border tint from the linked goal's color.
- **Motion**: spring on drop, layout animation on move/resize, staggered fade-in on load.

## New/changed surfaces

```text
/planner
├── Header (title, weekly total, Export .ics, "+ New" button)
├── Layout: [Task tray | Week grid]
│   ├── Task tray (desktop rail, mobile bottom sheet)
│   │   └── Unscheduled cards (draggable)
│   └── Week grid
│       ├── Day headers with per-day totals + today highlight
│       ├── Now-line indicator
│       ├── Time column
│       └── 7 day columns (droppable, click-drag to create)
│           └── Blocks (draggable, resizable, context menu)
├── Sheet/Drawer editor (create + edit)
└── Command palette (⌘K, global on planner)
```

## Technical section

**Libraries to add**

- `@dnd-kit/core` + `@dnd-kit/modifiers` — drag/drop for blocks and tray cards. Accessible, keyboard support built in.
- `framer-motion` — layout transitions on move/resize/drop and tray reordering.
- `cmdk` — command palette.
- `chrono-node` — natural-language date/time parsing for the palette.
- `react-hotkeys-hook` — keyboard shortcuts scoped to the planner route.

Shadcn components to add if not present: `sheet`, `drawer`, `context-menu`, `command`, `tooltip`, `progress`.

**Database**

- New table `public.unscheduled_tasks` (user_id, title, goal_id nullable, technique, planned_minutes, position int for tray order, timestamps). Full RLS + GRANTs per project rules. Delete row when placed on grid (turned into a `planned_blocks` row).

**Server functions** (new `src/lib/unscheduled.functions.ts`)

- `listUnscheduledTasks`, `createUnscheduledTask`, `updateUnscheduledTask`, `deleteUnscheduledTask`, `reorderUnscheduledTasks`.
- Extend `src/lib/planner.functions.ts` with `updatePlannedBlock` (day, start_minute, planned_minutes, end_minute) — currently only create + delete exist.

**Client architecture**

- Split `src/routes/_authenticated/planner.tsx` into:
  - `planner.tsx` — route, data wiring, DndContext, hotkeys, palette host.
  - `components/planner/week-grid.tsx` — grid + now-line + drag-to-create.
  - `components/planner/planner-block.tsx` — draggable/resizable block with context menu.
  - `components/planner/task-tray.tsx` — unscheduled list, draggable cards, quick-add.
  - `components/planner/block-editor.tsx` — Sheet/Drawer form (replaces current modal `BlockForm`).
  - `components/planner/planner-palette.tsx` — cmdk + chrono-node parser.
  - `lib/planner-parse.ts` — pure parser (task title + day + time + minutes + technique + optional goal by fuzzy match).

**Interaction details**

- Snap = 15 minutes. Grid row stays 30-min visual but drag math snaps to 15.
- Drag-to-create uses a `pointerdown` on the day column, tracks pointer Y, renders a translucent ghost block, opens the editor Sheet on `pointerup` with computed start/duration.
- Resize handle: 6px hit area on block bottom edge; separate dnd-kit sensor. Enforce min 15m, max 240m.
- Move: dnd-kit `useDraggable` on the whole block minus the resize handle; day columns are `useDroppable`. On drop, call `updatePlannedBlock` optimistically with React Query mutation + rollback on error.
- Now-line: `useEffect` interval every 60s; only rendered for today's column; auto-scroll on mount if between 6am–10pm.
- Editor Sheet on ≥md breakpoint (`side="right"`, width ~420px), Drawer on `<md`. Same form used for create and edit.
- Context menu items call the same mutations as toolbar buttons.

**Analytics**

- Emit events via existing `logEvent`: `planner_block_created` (source: drag/tap/tray/palette), `planner_block_moved`, `planner_block_resized`, `planner_block_started`, `planner_palette_opened`, `planner_tray_task_created`, `planner_tray_task_placed`.

**Accessibility**

- Every drag interaction has a keyboard equivalent (arrow-key nudge, `Enter` to open editor, `Delete` to remove).
- Blocks are `role="button"` with `aria-label` describing day/time/duration/title.
- Sheet/Drawer manage focus trap via shadcn primitives.
- Respect `prefers-reduced-motion` — disable spring/layout transitions.

**Out of scope**

- Multi-week view, recurring blocks, external calendar sync (Google/Apple), collaborative planning, AI-suggested schedules. All can follow later.

## Rollout

1. Add libraries + shadcn components; add `unscheduled_tasks` migration and `updatePlannedBlock` server fn.
2. Extract block/editor components; swap modal → Sheet/Drawer. No behavior change yet.
3. Add drag-to-move + resize + optimistic mutations + motion.
4. Add drag-to-create on empty grid.
5. Add task tray (list, create, drag onto grid).
6. Add command palette + hotkeys.
7. Add now-line, per-day totals, goal-colored blocks, context menu.
8. Analytics events + a11y pass + reduced-motion check.
