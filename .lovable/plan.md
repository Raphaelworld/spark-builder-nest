
## Goal

Replace the current warm-editorial palette in `src/styles.css` with the exact color tokens from the uploaded DESIGN.md. No new components, no typography changes, no motion/utility patterns, no Garden. Pillar accents (Forest/Persimmon/Cobalt/Mustard) are used decoratively — they carry no semantic meaning in Gobez.

## Scope

**In:** color tokens only, both light and dark modes, mapped through Tailwind v4's `@theme inline` so utilities like `bg-paper`, `text-ink`, `bg-forest-3`, `text-persimmon`, `border-cobalt`, `bg-terracotta` all exist.

**Out:** fonts (keep DM Sans / DM Serif Display), surface hierarchy scale, `.card-hover` / `.warm-callout` / focus-ring / skeleton / film-grain utilities, motion tiers, garden tokens, component refactors.

## Changes

### 1. `src/styles.css` — token rewrite

Under `:root`, replace the current OKLCH values with the DESIGN.md hex values (converted, kept as hex for fidelity):

- Base: `--paper #FFFDF9`, `--cream #FAF7F2`, `--ink #2C241D`, `--headline #1E1814`, `--muted-foreground #8B7E6F`
- Forest: `--forest #3D5A46`, `--forest-2 #5A7A64`, `--forest-3 #EBF2ED`
- Persimmon: `--persimmon #C2795C`, `--persimmon-2 #D4957A`, `--persimmon-3 #FAF0EB`
- Cobalt: `--cobalt #5B739C`, `--cobalt-2 #7A8FB3`, `--cobalt-3 #EEF1F6`
- Mustard: `--mustard #B8943E`, `--mustard-2 #D0AE5A`, `--mustard-3 #F9F4E8`
- Brand: `--terracotta #C2795C` (reuse persimmon hue for CTA), `--deep-teal #2F5D62`

Under `.dark`, apply the dark-mode column verbatim.

### 2. Remap shadcn semantic tokens

Keep the existing shadcn variable names (`--background`, `--foreground`, `--primary`, `--card`, `--border`, `--ring`, `--destructive`, `--success`, `--warning`, `--accent`, `--muted`, sidebar tokens, chart tokens) so no component breaks. Point them at the new palette:

- `--background` → `--paper`, `--foreground` → `--ink`
- `--card` → `--paper` (light) / `#252320` cream-dark (dark)
- `--primary` → `--terracotta`, `--primary-foreground` → paper
- `--secondary` / `--muted` / `--accent` → cream + persimmon-3 tints
- `--border` / `--input` → warm hairline derived from ink at low alpha
- `--ring` → terracotta
- `--success` → forest, `--warning` → mustard, `--destructive` keep current red-family but retune to sit on the new paper
- Charts: `--chart-1..5` → persimmon, forest, cobalt, mustard, deep-teal (decorative variety)
- Sidebar tokens → cream / ink pair

### 3. Extend `@theme inline` to publish the new utilities

Add the new color entries so Tailwind generates the classes the DESIGN.md promises even though we're only using them incidentally:

```css
@theme inline {
  --color-paper: var(--paper);
  --color-cream: var(--cream);
  --color-ink: var(--ink);
  --color-headline: var(--headline);
  --color-forest: var(--forest);
  --color-forest-2: var(--forest-2);
  --color-forest-3: var(--forest-3);
  /* …persimmon, cobalt, mustard 1/2/3… */
  --color-terracotta: var(--terracotta);
  --color-deep-teal: var(--deep-teal);
}
```

This yields `bg-paper`, `text-ink`, `bg-forest-3`, `text-persimmon`, `border-cobalt`, `bg-terracotta`, etc., alongside the existing shadcn utilities. No component code changes required.

### 4. Verify contrast

Spot-check AA on the new pairs actually used by shadcn semantics:
- `--ink` on `--paper` (body)
- `--terracotta` (primary) foreground on paper — if it fails, darken `--primary` to a slightly deeper terracotta while keeping the token name.
- `--muted-foreground` on `--paper` and on `--cream`.
- Dark mode equivalents.

If any pair fails, adjust only the shadcn semantic mapping (not the DESIGN.md base tokens).

## Verification

- `bun run tsc`-equivalent typecheck (runs automatically).
- Preview: skim `/`, `/auth`, `/today`, `/planner`, `/goals`, `/insights`, `/settings` in both light and dark to confirm nothing regressed visually and the palette shifted to the new warm/pillar tones.

## Out of scope for later

If you later want the pillar accents to carry meaning (per-technique or per-goal), or want the surface scale / motion tiers / Garden system, that's a separate pass on top of this palette swap.
