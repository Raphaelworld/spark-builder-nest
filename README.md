# Gobez — Spark Builder Nest

A study/focus companion app: plan your week in blocks, run focus sessions with check-ins and a coach, reflect afterwards, and track goals and insights over time.

Built with [Lovable](https://lovable.dev) and connected to a hosted Supabase backend (Lovable Cloud).

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19) with file-based routing
- Vite 8 + Tailwind CSS v4 + shadcn/ui (Radix)
- Supabase (remote hosted — there is no local database to run)
- Deploys to Cloudflare via nitro; a Render blueprint (`render.yaml`) also exists

## Getting started

```sh
npm install
npm run dev        # dev server on http://localhost:8080
```

The committed `.env` contains the Supabase URL and **publishable** (public, client-side) keys, so the dev server talks to the live backend out of the box. Never commit service-role or other secret keys.

## Scripts

| Command                | What it does                     |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Vite dev server on port 8080     |
| `npm run build`        | Production build (Vite + nitro)  |
| `npm run preview`      | Preview the production build     |
| `npm run lint`         | ESLint (includes Prettier check) |
| `npm run typecheck`    | TypeScript `tsc --noEmit`        |
| `npm run format`       | Prettier auto-format             |
| `npm run format:check` | Prettier check without writing   |

## Development notes

- **Routing** is file-based under `src/routes/`; `src/routeTree.gen.ts` is auto-generated — never hand-edit it. Authenticated pages live under `src/routes/_authenticated/`.
- **Package manager**: use `npm` (`package-lock.json` is the source of truth). `bun.lock`/`bunfig.toml` exist because Lovable uses bun internally.
- **Lovable sync**: commits pushed to the connected branch sync back to Lovable. Avoid force-pushing or rewriting published history, and keep `main` in a working state.
- **Auth for testing**: the hosted Supabase project requires email confirmation, so a freshly signed-up account cannot log in without confirming. Use an already-confirmed test account or Google OAuth to exercise authenticated flows.
- See `AGENTS.md` for agent/cloud-environment specifics.

## CI

Every push to `main` and every pull request runs lint, typecheck, and build via GitHub Actions (`.github/workflows/ci.yml`). Dependabot keeps npm dependencies and workflow actions up to date with weekly, grouped PRs.
