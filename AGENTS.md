<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Cursor Cloud specific instructions

- Stack: TanStack Start (React 19) + Vite 8 + Tailwind v4, "Gobez" study/focus app. Backend is a **remote hosted Supabase** project (Lovable Cloud); there is no local database to run. Credentials are committed in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, etc.), so the dev server talks to live Supabase out of the box.
- Package manager: use `npm` (an `npm` `package-lock.json` is present). A `bun.lock`/`bunfig.toml` also exist because Lovable uses bun, but bun is not installed here — `npm install` works and is what the update script uses. Don't run `pnpm`/`yarn`.
- Standard scripts live in `package.json`: `npm run dev` (Vite dev server, serves on **port 8080**), `npm run build` (Vite + nitro build, targets Cloudflare), `npm run lint` (eslint), `npm run format` (prettier).
- `npm run lint` currently reports many pre-existing `prettier/prettier` errors in checked-in source — this is the repo's existing state, not an environment problem. Run `npm run format` to auto-fix, but do not bundle formatting churn into unrelated changes.
- Routing is file-based (TanStack Start) under `src/routes/`; `src/routeTree.gen.ts` is auto-generated — don't hand-edit it. See `src/routes/README.md`.
- Auth gotcha for end-to-end testing: the hosted Supabase project has email confirmation **enabled** (`mailer_autoconfirm=false`) and no service-role key is available in this environment, so a freshly signed-up account cannot sign in without confirming via email. To exercise authenticated flows (Today, Planner, Goals, Insights, focus sessions), use an already-confirmed test account or Google OAuth login rather than creating a new email/password account.
