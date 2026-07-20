## Goal

Replace the current terracotta/persimmon-based primary theme with the GlobalLogic brand palette:

- Orange `#F37037` (primary)
- Black `#000000`
- White `#FFFFFF`
- Light Grey `#E6E7E8`

This drives logo, buttons, icons, links, focus rings, active nav, CTA, chart-1, and sidebar primary — everything that currently reads "terracotta".

## Scope

**In:** color token swap only, in `src/styles.css`. Both light and dark modes. No component code changes — everything already reads through semantic tokens (`--primary`, `--ring`, `bg-primary`, etc.).

**Out:** typography, layout, spacing, pillar accents used decoratively in charts/goal colors (Forest / Cobalt / Mustard stay as chart variety). Logo mark stays as-is (it inherits `--primary`).

## Changes to `src/styles.css`

### `:root` (light)

- `--terracotta: #F37037` (was `#B26A4E`) — the single change that cascades to `--primary`, `--ring`, `--sidebar-primary`, `--chart-1`-adjacent usage.
- `--persimmon: #F37037`, `--persimmon-2: #F58A5A`, `--persimmon-3: #FEEDE3` — retune the persimmon ramp to the GlobalLogic orange family so `bg-accent` / `bg-persimmon-*` stay coherent.
- `--cream: #F5F5F6` (slightly cooler, derived from Light Grey `#E6E7E8` lightened) so secondary surfaces align with the new neutral.
- `--muted: var(--cream)` unchanged mapping; `--muted-foreground` retuned to `#5A5A5C` for AA on the cooler cream.
- `--border`, `--input`: keep alpha-on-ink but verify on white.
- `--ink` stays `#2C241D` (near-black reads fine with orange); optionally shift to pure `#111` if the user wants a stricter black. Not doing that unless asked.
- `--chart-1: var(--persimmon)` → now GlobalLogic orange. Chart 2–5 keep Forest/Cobalt/Mustard/Deep-teal for legible multi-series.

### `.dark`

- `--terracotta: #F37037` (same brand orange; already legible on dark).
- `--persimmon: #F58A5A`, `--persimmon-2: #F7A582`, `--persimmon-3: #2A1810`.
- `--paper`, `--cream`, `--ink` unchanged.
- `--primary-foreground` stays near-black (`#1E1C19`) for contrast on orange.

### Contrast check

- White text on `#F37037` primary buttons: ~3.1:1 — fails AA for body text. Keep primary-foreground = near-black (`#1E1814`), which passes ~7:1. Update `--primary-foreground` in light mode from `#FFFDF9` to `#1E1814`.
- Orange on white for links/icons: ~3.1:1 — OK for large/UI elements, not body copy. Existing usage is buttons/icons/accents only, so acceptable.

## No component edits

`bg-primary`, `text-primary`, `ring-primary`, `bg-sidebar-primary`, `border-primary`, `text-chart-1` all resolve through the tokens above. Logo (`Gobez` wordmark using `text-primary`), CTA buttons, active nav pill, focus rings, and Coach card accents update automatically.

## Verification

- Typecheck (auto).
- Spot-check `/today` (CTA + streak icons), `/planner` (New block button, palette highlights), `/goals` (color chips still varied), `/insights` (chart-1 line is now orange, others unchanged), `/auth` (Sign in button), both light and dark.
- Confirm primary button text remains readable (near-black on orange).

## Out of scope

- Reworking goal color options (terracotta/sage/ocean/gold/plum) in the Goal creator. If you want the goal palette itself rebranded to only GlobalLogic hues, that's a separate pass.
- Changing the wordmark font or logo mark artwork.
