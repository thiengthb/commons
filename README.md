# @thiengthb/commons — the platform's shared registry

A **shared, installable** set of building blocks for every project in the fleet, distributed as a **shadcn
custom registry** — i.e. **copy-in, NOT a runtime dependency**. Today that is 15 React/Next UI components;
the registry is being widened to also carry helpers, hooks, rule-enforcing tests, ops scripts, configs and a
whole-app starter (roadmap: `docs/plans/2026-07-29-commons-install-surface.md`).

> **Why copy-in rather than an npm package?** Each project here is an independent repo + Docker image. A
> runtime dep (`@thiengthb/ui`) would force a private npm registry + a publish pipeline + coordinated version
> bumps across many repos at once, and goes against the shadcn philosophy ("a component is code you own, not a
> dep"). Copy-in: each project pulls the source down, **owns and can edit it**, with no runtime coupling. The
> trade-off is real — a fix here does **not** propagate automatically; on an important patch, `shadcn add` it
> again. Full reasoning: `docs/decisions.md`.

## What's in the registry

The table below is **generated from `registry.json`** — do not hand-edit it. Run `npm run readme` after adding
or changing an item (CI runs `npm run readme:check` and fails on a stale table).

<!-- BEGIN GENERATED: items (node scripts/gen-readme.mjs) -->

<!-- 24 items -->

| Item                        | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Installs to                                                                                                                                                                                                                                             | Also pulls in                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `truncate`                  | Smart single-line clamp — shows the tooltip only when the text actually overflows.                                                                                                                                                                                                                                                                                                                                                                                                                     | `components/ui/truncate.tsx`                                                                                                                                                                                                                            | `tooltip`                                                                                                                                                |
| `empty-state`               | The shared "nothing here yet" box: dashed border + icon + title + description + action, or free-form children when the copy is rich.                                                                                                                                                                                                                                                                                                                                                                   | `components/empty-state.tsx`                                                                                                                                                                                                                            | npm `lucide-react`                                                                                                                                       |
| `icon-tooltip`              | Read-only tooltip for icon buttons — replaces every title= attribute. Short content on hover/focus.                                                                                                                                                                                                                                                                                                                                                                                                    | `components/icon-tooltip.tsx`                                                                                                                                                                                                                           | `tooltip`                                                                                                                                                |
| `info-hint`                 | An info icon that opens a Popover on click/tap — replaces long inline descriptions, touch- and a11y-friendly.                                                                                                                                                                                                                                                                                                                                                                                          | `components/info-hint.tsx`                                                                                                                                                                                                                              | `popover`, npm `lucide-react`                                                                                                                            |
| `info-tooltip`              | An info icon showing its description in a tooltip on hover/focus — the minimal sibling of info-hint; wraps and clamps. For titles and labels.                                                                                                                                                                                                                                                                                                                                                          | `components/info-tooltip.tsx`                                                                                                                                                                                                                           | `tooltip`, npm `lucide-react`                                                                                                                            |
| `reveal`                    | Fade + slide-up on entering the viewport, pure CSS, respects reduced-motion.                                                                                                                                                                                                                                                                                                                                                                                                                           | `components/reveal.tsx`                                                                                                                                                                                                                                 | –                                                                                                                                                        |
| `field`                     | Wraps label + control + hint/info for forms; cells fill a sm:grid-cols-2 grid.                                                                                                                                                                                                                                                                                                                                                                                                                         | `components/field.tsx`                                                                                                                                                                                                                                  | `@thiengthb/info-tooltip`                                                                                                                                |
| `date-picker`               | Popover + Calendar, value is a local "YYYY-MM-DD" string. Date helpers inlined.                                                                                                                                                                                                                                                                                                                                                                                                                        | `components/ui/date-picker.tsx`                                                                                                                                                                                                                         | `button`, `calendar`, `popover`, npm `date-fns`, npm `lucide-react`                                                                                      |
| `time-picker`               | Typed input + a Popover of time presets (15 min), value is a local "HH:MM" string. Time helpers inlined.                                                                                                                                                                                                                                                                                                                                                                                               | `components/ui/time-picker.tsx`                                                                                                                                                                                                                         | `input`, `popover`, `scroll-area`, npm `lucide-react`                                                                                                    |
| `skeletons`                 | Skeleton set (PageHeader/Card/List/Grid) matching the standard card stock — for loading.tsx.                                                                                                                                                                                                                                                                                                                                                                                                           | `components/skeletons.tsx`                                                                                                                                                                                                                              | `skeleton`                                                                                                                                               |
| `data-pagination`           | Controlled pagination (page/pageCount/onPageChange) + an ellipsis page window + an optional rows-per-page select; works for client- or server-side paging.                                                                                                                                                                                                                                                                                                                                             | `components/ui/data-pagination.tsx`                                                                                                                                                                                                                     | `button`, `select`, npm `lucide-react`                                                                                                                   |
| `page-header`               | Consistent page header: eyebrow + h1 + description (as an info tooltip) + action + back-link. Next-only (next/link).                                                                                                                                                                                                                                                                                                                                                                                   | `components/page-header.tsx`                                                                                                                                                                                                                            | `@thiengthb/info-tooltip`, npm `lucide-react`                                                                                                            |
| `app-sidebar`               | Config-driven navigation sidebar on the shadcn sidebar primitive: collapses to an icon rail (Cmd/Ctrl+B), switches to a Sheet on mobile, persists its state in a cookie, per-item tooltip when collapsed. Takes brand + groups (lucide icons) + footer. Next-only (next/link + navigation).                                                                                                                                                                                                            | `components/app-sidebar.tsx`                                                                                                                                                                                                                            | `sidebar`, npm `lucide-react`                                                                                                                            |
| `breadcrumbs`               | Parent-to-child navigation trail: each crumb carries an icon + a description tooltip; the last one marks the current page.                                                                                                                                                                                                                                                                                                                                                                             | `components/breadcrumbs.tsx`                                                                                                                                                                                                                            | `tooltip`, npm `lucide-react`                                                                                                                            |
| `data-table`                | Config-driven CRUD table on TanStack Table: multi-column sort (Shift-click), draggable column widths, show/hide columns, global search, a filter slot, a row-number column, multi-row selection + an app-supplied bulk action bar, and pagination — the whole view persisted to sessionStorage and mirrored to the URL. The app supplies columns (any cell renderer: edit/delete/badge) + the filters.                                                                                                 | `components/data-table.tsx`                                                                                                                                                                                                                             | `table`, `button`, `checkbox`, `dropdown-menu`, `input`, `@thiengthb/data-pagination`, npm `@tanstack/react-table`, npm `lucide-react`                   |
| `lib-db`                    | The global-cached PrismaClient every app needs — a fresh client per hot-reload exhausts connections in dev. Import { prisma } from '@/lib/db'.                                                                                                                                                                                                                                                                                                                                                         | `lib/db.ts`                                                                                                                                                                                                                                             | npm `@prisma/client`                                                                                                                                     |
| `script-rebuild-and-verify` | Rebuilds a local containerized app and proves it serves: bounded health wait then a route sweep, so the exit code reflects the ROUTES rather than the build. Universal item — installs into any repo, framework-agnostic. Per-repo values live in scripts/verify.env, so the script itself stays identical everywhere.                                                                                                                                                                                 | `~/scripts/rebuild-and-verify.sh`                                                                                                                                                                                                                       | –                                                                                                                                                        |
| `config-vitest`             | The platform's Vitest setup for a Next App Router + React 19 app: node environment by default (server actions and pure logic), jsdom opted into per file, the @/* alias resolved from tsconfig, and jest-dom matchers loaded. Universal item — lands vitest.config.ts + vitest.setup.ts at the repo root.                                                                                                                                                                                              | `~/vitest.config.ts`<br>`~/vitest.setup.ts`                                                                                                                                                                                                             | –                                                                                                                                                        |
| `config-eslint`             | Flat ESLint config for a Next.js app: core-web-vitals + typescript, with eslint-config-next's default ignores restated so they survive the override. Formatting stays with Prettier — ESLint carries logic rules only.                                                                                                                                                                                                                                                                                 | `~/eslint.config.mjs`                                                                                                                                                                                                                                   | –                                                                                                                                                        |
| `config-prettier`           | The platform formatting contract — single quotes, semicolons, print width 100, trailing commas, LF. Identical in every repo, so formatting never shows up as noise in a diff.                                                                                                                                                                                                                                                                                                                          | `~/.prettierrc`<br>`~/.prettierignore`                                                                                                                                                                                                                  | –                                                                                                                                                        |
| `page-shell`                | The one page wrapper every route uses: vertical rhythm, the body-size baseline, a content width tier (full/wide/narrow/form) and a header row carrying the breadcrumb, tabs and page actions. Everything app-specific is a slot, so the file is identical in every repo. Implements platform/standards/ui-layout.md. No next/* import — works in any React app.                                                                                                                                        | `components/page-shell.tsx`                                                                                                                                                                                                                             | –                                                                                                                                                        |
| `theme-toggle`              | Light/dark control in the shapes the apps use — a ghost icon button, a labelled Switch row, or both (the shadcn sidebar's collapsed state picks). The icon shows the CURRENT theme and the aria-label names the ACTION; all copy is a prop, since user-facing text follows the product's language.                                                                                                                                                                                                     | `components/theme-toggle.tsx`                                                                                                                                                                                                                           | `button`, `switch`, npm `lucide-react`, npm `next-themes`                                                                                                |
| `test-no-emoji`             | Turns the platform's no-emoji rule into a failing test that names every offending file:line. Roots and deliberate exceptions live in docs/gates.json, so the test file stays identical in every repo. Installing it into an existing app is a MIGRATION, not a copy — it lands red on whatever drift is already there.                                                                                                                                                                                 | `~/lib/no-emoji.test.ts`                                                                                                                                                                                                                                | –                                                                                                                                                        |
| `starter-web-app`           | The whole spine of a platform web-app in one command: a multi-stage Dockerfile with EXPOSE + HEALTHCHECK, a local docker-compose with a named volume, the ghcr build workflow gated on tests, an open /api/health, the standalone next.config, the verify script's config, and the doc set (00-map, decisions, gates). Pulls in the vitest/eslint/prettier configs, the rebuild-and-verify script and the no-emoji gate. Prisma is NOT assumed — the Dockerfile documents the three edits that add it. | `~/Dockerfile`<br>`~/.dockerignore`<br>`~/docker-compose.yml`<br>`~/next.config.ts`<br>`~/app/api/health/route.ts`<br>`~/.github/workflows/deploy.yml`<br>`~/scripts/verify.conf`<br>`~/docs/00-map.md`<br>`~/docs/decisions.md`<br>`~/docs/gates.json` | `@thiengthb/config-vitest`, `@thiengthb/config-eslint`, `@thiengthb/config-prettier`, `@thiengthb/script-rebuild-and-verify`, `@thiengthb/test-no-emoji` |

<!-- END GENERATED: items -->

Sources live in `registry/thiengthb/*.tsx`. Every item assumes the consuming project already has shadcn
(`@/lib/utils` exports `cn`, the `@/` alias resolves) — as every frontend in this fleet does.

**Next-only items** (they import `next/link` / `next/navigation`): `page-header`, `app-sidebar`, `breadcrumbs`.

## 1) Consuming from another project

### Approach A — LOCAL path (zero-infra, works right now)

Every project sits beside this one on the same machine, so point straight at the built JSON:

```bash
cd ../journal
npx shadcn@latest add ../commons/public/r/truncate.json
npx shadcn@latest add ../commons/public/r/empty-state.json
```

shadcn copies the component to the item's `target`, installs its npm deps and pulls any missing shadcn
primitives (`tooltip`, `popover`, …).

> With Approach A, a `@thiengthb/*` **registry dependency is not resolved** — add it yourself first
> (e.g. `info-tooltip.json` before `page-header.json`, `data-pagination.json` before `data-table.json`).

### Approach B — namespaced registry (from any machine, and what agents use)

Declare the registry once in the consuming project's `components.json`:

```jsonc
{
  "registries": {
    "@thiengthb": "https://raw.githubusercontent.com/thiengthb/commons/main/public/r/{name}.json",
  },
}
```

Then:

```bash
npx shadcn@latest add @thiengthb/truncate
npx shadcn@latest add @thiengthb/page-header    # pulls in @thiengthb/info-tooltip automatically
npx shadcn@latest add @thiengthb/data-table     # pulls in @thiengthb/data-pagination automatically
```

Transitive `@thiengthb/*` deps resolve on this path, which is why it is the preferred one. It also makes the
registry reachable by the **shadcn MCP server**, so an agent working in another repo can search and install
items by name instead of re-writing them.

## 2) Adding an item

A UI component goes in the root manifest; anything else goes in its layer (`registry/{lib,script,config,block,test,starter}/`).
This procedure ran six times on 2026-07-29/30 and each numbered trap below cost a real debugging round —
they are listed so the seventh time is cheap.

1. **Put the source in its layer** — `registry/thiengthb/<name>.tsx` for UI (keep the `@/lib/utils` +
   `@/components/ui/*` imports as in an app), otherwise `registry/<layer>/<file>`.
2. **Declare it** in that layer's `registry.json` (create the file and add it to the root manifest's
   `include` if the layer is new): `dependencies` (npm) + `registryDependencies` + `files[].target`.
   - ⚠️ In an **included** manifest, `files[].path` is relative to **that manifest**, not to the repo root.
     `registry/lib/db.ts` fails validation there; `db.ts` is correct.
   - ⚠️ A sibling item must be `@thiengthb/<name>`. Bare `data-pagination` resolves against the DEFAULT
     shadcn registry and the install fails with "item not found".
   - To make the item **universal** (installable into a repo with no `components.json` — a config, a script,
     a CI file), give every file an explicit `~/`-rooted `target` and type `registry:file`.
3. **Build, regenerate, verify** — `npm run registry:build` → `npm run readme` → `npm run validate`.
4. **Install it somewhere and RUN it** before believing it. Reviewing a bundle proved nothing: the starter
   was uninstallable because a devDependency wanted Babel 8 against the shadcn CLI's Babel 7, and npm refused
   outright. Only `shadcn add` into a scratch app surfaced that.
   - A **local JSON path cannot resolve `@thiengthb/*` deps** — a multi-item bundle needs the namespaced
     registry declared in the consumer's `components.json`, and the value must be a real HTTP URL
     (`file://` returns "not implemented... yet"). For local iteration, serve `public/r` over a throwaway
     static server.
   - `--overwrite` is right on a fresh scaffold and **wrong on a living app**: it refetches the shadcn
     primitives listed as registry deps and will restyle them.
   - The **executable bit is not preserved**, so a shipped `.sh` arrives `rw-r--r--` — invoke it with `bash`.
   - A registry item **cannot** merge a script into `package.json`. Anything you ship must call `npx …`, never
     assume `npm test` exists.
5. **Commit `public/r/` in the same commit**, and add the row to `platform/registries/shared-assets.md` in that
   same change (`/code-reuse` law). `data-table` shipped two commits without its own bug fix because step 3
   was skipped — CI now gates it.

**Only STABLE, product-agnostic things belong here.** Per-app UI (`streak-chip`, `mood-picker`, `day-nav`)
stays in its app. The gate is `/code-reuse`'s rule of three, with one exemption: an artifact that implements a
**written platform standard** may be extracted at first use.

## 3) Local checks (what CI runs)

```bash
npm run validate       # shadcn registry validate — schema, duplicate names, local file paths
npm run readme:check   # the table above matches registry.json; descriptions are English
npm run registry:build # rebuild public/r — CI fails if this dirties the tree
npm run format:check   # prettier
```

## Known gotchas

- **The build embeds source as a string, so line endings are part of the output.** `.gitattributes` pins LF
  everywhere; without it a build on Windows bakes CRLF into `public/r/*.json` and hands consumers CRLF files
  (this happened to 11 of 15 items before 2026-07-29).
- **Editing `registry/**` without rebuilding ships nothing.** `public/r/*.json` is what consumers fetch, so an
  un-rebuilt fix is invisible to them — `data-table` shipped for two commits without its own bug fix. CI now
  gates this; run `npm run registry:build` before committing.
- **A bare `registryDependency` resolves against the DEFAULT shadcn registry.** Referencing a sibling item as
  `data-pagination` instead of `@thiengthb/data-pagination` makes the install fail with "item not found".
  `readme:check` now catches this.
- **`date-picker` pulls the shadcn `calendar`**, which depends on **`react-day-picker`**. The `calendar`
  template must match the installed major (v8 uses `classNames.table`; v9/v10 changed the API → the mismatch
  errors with `'table' does not exist in type Partial<ClassNames>`). Fix: re-add `calendar` at the version
  matching the project's `react-day-picker`, or skip `date-picker` if unused.

## Relation to the shared rules

This is the **install** half of the platform's reuse model: artifacts that land _in_ a repo live here; the
_law_ they follow (`platform/standards/ui-layout.md`, `/react-ui-craft`, `/coding-convention`) is read from
`platform/`, not installed. The catalog of what exists and where is
`platform/registries/shared-assets.md`, owned by `/code-reuse`.
