---
title: commons — from a UI registry to the platform's INSTALL SURFACE (ui · lib · hooks · tests-as-gates · scripts · configs · starter bundle)
status: active # accepted 2026-07-29 by the supervisor — Option A, execute Phase 0+1 first then report before Phase 2
kind: system-change
created: 2026-07-29
updated: 2026-07-29 # Phases 0, 1 and 2 done (2.4 deliberately NOT extracted, see the verdict table); next = Phase 3, the starter
checkin: 2026-08-26
checkin_owner: supervisor
related:
  [
    commons/registry.json,
    commons/docs/decisions.md,
    platform/registries/shared-assets.md,
    platform/standards/ui-layout.md,
    platform/plans/2026-07-29-idea-0023-mcp-platform-server-build.md,
    .claude/skills/code-reuse/SKILL.md,
  ]
---

## Goal

One command puts a **proven artifact** of this platform into any repo — not only a React component, but a helper, a
hook, a rule-enforcing test, an ops script, a config, or the whole web-app spine. Done looks like: a brand-new empty
repo reaches "builds + tests green + container healthy + matches the platform's UI/doc/test standards" in **one
`shadcn init --template` + one `shadcn add @thiengthb/starter-web-app`**, with the wall-clock recorded.

## Context

`commons` today ships **15 UI components and nothing else**. Everything else reusable on this platform is stranded:

| Stranded thing                                                                                                                                     | Where it actually lives                                                  | Consequence                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `PageShell` — a **MANDATORY, "STRICT, no exceptions"** standard (`platform/standards/ui-layout.md`)                                                | `sakubun/components/shell/page-shell.tsx` (1 app)                        | a new app must hand-copy the platform's own required page frame           |
| 4 convention gates: `no-emoji`, `layout-standard`, `type-scale`, `ui-pattern-lock` (`*.test.ts`)                                                   | `sakubun/lib/` (1 app)                                                   | the rules exist as prose everywhere and as a **gate** in exactly one repo |
| `db.ts` Prisma singleton                                                                                                                           | `todo`, `journal` (byte-identical but one comment), `sakubun` (diverged) | 3× copy, no canonical                                                     |
| `vitest.config.ts` + `vitest.setup.ts` + `eslint.config.mjs`                                                                                       | `todo` == `journal` == `yakudoku/web`, **identical**                     | 3-4× copy, no canonical                                                   |
| Ops procedures: `rebuild-and-verify.sh`, `verify-image.sh`, `verify-restore.sh`, `backup-*.sh`, `ui-audit.mjs`                                     | `sakubun/scripts/` (1 app)                                               | every other app re-derives "how do I verify a deploy"                     |
| 24 generic components/hooks (`confirm-dialog`, `search-input`, `use-session-state`, `use-server-action`, `use-paged-list`, `motion-primitives`, …) | `sakubun/components/shared/`                                             | the next app rebuilds them                                                |

`shared-assets.md` already catalogues most of this, and 6 rows sit at **"DUPLICATED — 2×, the expected 3rd never
arrived"**. So the bottleneck is _not_ discovery-by-catalog (that exists and works); it is that **the catalog points at
a file in someone else's repo instead of at something installable.**

Measured while writing this plan: the platform's own "no emoji" rule is broken in **14 files** across `todo` (6),
`journal` (1), `yakudoku/web` (7). Prose lost. A gate that exists in one repo does not govern a platform.

## Approach & tradeoffs

**The organizing axis is MECHANISM, not content type.** This keeps the 2026-07-28 boundary intact instead of
re-litigating it:

| Question about an artifact                                               | Home              | Unchanged by this plan                 |
| ------------------------------------------------------------------------ | ----------------- | -------------------------------------- |
| Is it **installed** — a file lands in a consumer repo?                   | **`commons`**     | ← this plan widens _only_ this row     |
| Is it **read** by a human/agent to decide? (law, standard, catalog, ADR) | `platform/**`     | yes — no rule prose moves into commons |
| Is it **enforced at generation time** in another repo?                   | `rulebook` plugin | yes                                    |

So: `commons` gets the _enforcement artifacts_ (a test, a hook script, a config, a CI job); `platform/` keeps the
_law_. A rule that can only be described stays in `platform/`; a rule that can be **executed** ships as an item.

### Options

| Option                                                                                                                                                             | What it is                                                                                                                                          | Verdict                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — extend the existing shadcn registry to every artifact class** (`registry:lib`/`hook`/`file`/`item` universal items + `include` + a `starter-web-app` bundle) | one mechanism, already installed and proven, framework-agnostic for non-React files (an item is universal when every file has an explicit `target`) | **(khuyến nghị)** — nothing new to learn, nothing new to host, works today, and `shadcn registry validate` gives a CI gate for free                                                                                                                 |
| B — Copier template repos                                                                                                                                          | `copier update` merges upstream template diffs into an already-generated project — the one thing copy-in genuinely lacks                            | ruled out as the primary: needs a Python+Jinja templating layer over every file, and it scaffolds **whole repos only** — it cannot add one item to a living app. **Kept as the escape hatch** for whole-repo creation in non-JS languages (Phase 5) |
| C — publish `@thiengthb/ui` npm packages (runtime deps)                                                                                                            | real versioning + auto-propagation                                                                                                                  | ruled out: already decided against (`commons/docs/decisions.md`, 2026-06) — private registry + publish pipeline + coordinated bumps across independent repos; re-couples release cycles                                                             |
| D — convert `fleet` to a monorepo (Turborepo/Nx workspaces)                                                                                                        | true shared packages, one install                                                                                                                   | ruled out: the deploy model **is** independent repos → one image per repo (`INVENTORY`, every `targets/*/README.md`). Largest blast radius on the plan with the least new capability                                                                |

**Plain language:** we keep doing exactly what already works for buttons — `shadcn add` — and start using it for helpers,
scripts, configs and tests too. Nothing new to install; the same command, more kinds of things.

### The two design constraints borrowed from prior decisions

1. **Availability ≠ usage.** `platform/plans/2026-07-29-idea-0023-*` measured this the expensive way and chose a plugin
   hook over an MCP tool because _"an MCP tool only runs when the consuming model chooses to call it — a hook always
   does."_ The same applies here: publishing items does not make them get used. Therefore Phase 4 pairs discovery (MCP /
   `components.json`) with a **gate** (a hook/test that fires when a repo hand-writes something commons already ships).
2. **Rule of three still binds** — with one stated exemption: an artifact that implements a **written platform standard**
   (e.g. `PageShell`) is not speculative sharing, so it may be extracted at 1×. Everything else waits for the 3rd use,
   and the deferred list is written down (below) so a later session doesn't re-decide it.

### Naming convention for the widened registry

Existing UI item names stay **unchanged** (renaming would break `shadcn add @thiengthb/data-table` in living repos).
New non-UI classes take a legible prefix, because those names are what an agent sees in `shadcn view`:
`lib-*` · `hook-*` · `test-*` · `script-*` · `config-*` · `block-*` · `starter-*`. Machine grouping uses `categories`;
source layout uses `include` (one `registry.json` per layer folder, flattened at build).

## Acceptance criteria (Given / When / Then)

- **AC-1** — Given a clean checkout on **any** machine, When `npx shadcn build` runs, Then `git status public/r` stays
  clean (the committed artifacts are machine-independent).
- **AC-2** — Given a change to `registry/**` committed **without** rebuilding, When the registry workflow runs, Then CI
  fails naming the stale artifact.
- **AC-3** — Given a new item in `registry.json` and a README not regenerated, When `node scripts/gen-readme.mjs --check`
  runs, Then it exits non-zero and names the missing item.
- **AC-4** — Given the whole `commons` repo, When grepped for `ui-kit`, `D:\Projects`, `nuc-platform`, Then 0 hits.
- **AC-5** — Given `registry.json`, When the description linter runs, Then no item description contains Vietnamese
  diacritics (dev artifacts are English; these strings are what `shadcn view` shows an agent).
- **AC-6** — Given `todo` (a living consumer), When the `lib-db` item is installed, Then the file lands at `todo/lib/db.ts`
  and `npx tsc --noEmit` + `npm test` stay green.
- **AC-7** — Given a directory with **no `components.json` and no `package.json`**, When the universal
  `script-rebuild-and-verify` item is installed, Then the file lands at `scripts/rebuild-and-verify.sh` and running it
  against a live app reports health + every route, exiting 0 on success and 1 on a bad route.
  _(Re-targeted 2026-07-29 during execution: the original wording named `journal`, but `journal/docker-compose.yml`
  brings up Postgres only — the app itself runs via `next dev`, so "the container is healthy" is not a thing that repo
  can report. A bare directory is also the stronger test of "universal", and the live-app half ran against the running
  `sakubun` with the `--verify-only` flag added for exactly this reason: never `compose up` a public app to test a script.)_
- **AC-8** — Given an app whose codebase violates a distributed rule, When its `test-*` gate item is installed and
  `npm test` runs, Then it fails listing exactly the offending files, and passes once they are cleaned or seeded.
- **AC-9** — Given an empty scratch dir, When `shadcn init --template next` + `shadcn add @thiengthb/starter-web-app` +
  `npm run build` + `npm test` + `docker compose up -d` run, Then the container is healthy and answers HTTP 200 — with the
  wall-clock recorded.
- **AC-10** — Given the starter item's file list, When grepped for `CLAUDE.md`, `.claude/`, `.env`, Then 0 matches (the
  agent never ships governance).
- **AC-11** — Given a repo that hand-writes a file whose basename matches a registry item, When the code-reuse gate runs,
  Then it warns and names the item to `shadcn add` instead.
- **AC-12** — Given a consumer holding a locally-forked copy of a registry item, When `audit-consumers.mjs` runs, Then it
  reports `FORKED` for that item (known-positive fixture: the 2026-07-19 `empty-state` fork).

## Steps

### Phase 0 — repair what the registry says about itself (P1, no new capability)

> **Verified live 2026-07-29 before writing this phase** (`cd commons`): `npx shadcn@latest` resolves to **CLI 4.16.0**,
> `shadcn registry validate` exists and passes (_"Checked 1 registry file and 15 items"_), and `shadcn build` reproduces
> all 15 artifacts. So Options A's mechanism is available today, not assumed.
>
> **…and the build is NOT reproducible across machines.** Running `build` on Linux rewrote **11 of 15**
> `public/r/*.json`, one line each: the committed artifacts embed the component source with **CRLF** (`\r\n`) because they
> were built on the Windows box; Linux emits LF. Two consequences: every consumer installing today gets CRLF source
> files, and the Phase-0.4 gate would go red on every machine switch. **0.0 must land before 0.4.**

- [x] 0.0 — Make the build machine-independent · Files: Create `.gitattributes` (`* text=auto eol=lf`, explicit
      `*.tsx`/`*.ts`/`*.json`), then `git add --renormalize .` + `shadcn build`, commit the LF artifacts ·
      Test: `AC-1` (`shadcn build` on Linux **and** on the Windows box both leave `git status public/r` clean)
- [x] 0.1 — Finish the `ui-kit` → `commons` rename · Files: Modify `README.md` (working tree already dirty),
      `package.json`, `registry.json` (`homepage`), `docs/00-map.md` (title + `MiniServer/ui-kit` paths),
      `docs/decisions.md` (title); replace dead `nuc-platform/*` refs with `platform/standards/*` ·
      Test: `AC-4` (`grep -ri 'ui-kit\|D:\\Projects\|nuc-platform' commons` returns 0 hits)
- [x] 0.2 — README's item table lists **10 of 15** items (missing `app-sidebar`, `breadcrumbs`, `data-table`,
      `data-pagination`, `info-tooltip`) → stop hand-maintaining it · Files: Create `scripts/gen-readme.mjs`
      (generate the table from `registry.json`; `--check` mode for CI, no test runner to install) ·
      Test: `AC-3` + `AC-5` (add an item without regenerating ⇒ non-zero exit naming it)
- [x] 0.3 — `registry.json` item `description`s are Vietnamese → English (dev-artifact rule; these strings are what
      `shadcn view` / the MCP server shows an agent in another repo) · Files: Modify `registry.json` ·
      Test: `AC-5` (the `--check` linter) + `shadcn registry validate` passes
- [x] 0.4 — Wire the build gate · Files: Create `.github/workflows/registry.yml` (`shadcn registry validate` →
      `gen-readme --check` → `shadcn build` → `git diff --exit-code public/r`) ·
      Test: `AC-2` (push a `registry/**` change without rebuilding ⇒ CI red)
      _(this replaces the 00-map invariant "every edit ⇒ rebuild + commit", which is currently only a sentence)_

### Phase 1 — thin slice: prove a NON-UI item installs (do not build 6 layers on an unproven mechanism)

- [x] 1.1 — Add `lib-db` (`registry:lib`, file target `~/lib/db.ts`) from the 3× copy · Files: Create `registry/lib/db.ts` + `registry/lib/registry.json`, Modify root `registry.json` (`include`) ·
      Test: `AC-1` (`shadcn registry validate` + `build` clean)
- [x] 1.2 — Install it into a living consumer · Files: `todo/lib/db.ts` (via `npx shadcn add ../commons/public/r/lib-db.json`) ·
      Test: `AC-6` (lands at the right path, `git diff` shows only the known comment line, `tsc --noEmit` + `npm test` green)
- [x] 1.3 — Add one **universal** item (no `components.json` required, explicit `target`) to prove framework-agnostic
      delivery · Files: Create `registry/script/rebuild-and-verify.sh` → target `~/scripts/rebuild-and-verify.sh` (from
      `sakubun/scripts/`, parameterized: app name + port + compose file from args/env, not hardcoded) ·
      Test: `AC-7` (install into `journal`, run it, container healthy)
- [x] 1.4 — Record the result in `docs/decisions.md` (mechanism proven / limits found) · Files: `docs/decisions.md` ·
      Test: `AC-6` + `AC-7` both closed · **STOP and report before Phase 2**

### Phase 2 — extract what has already earned it (gated, not a sweep)

Verdicts fixed now so a later session executes instead of re-deciding:

| Candidate                                                                                                                                                                                                                                                                                                                                                                                                                  | Count today         | Verdict                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `block-app-frame`: `page-shell` + `app-shell` + `breadcrumbs` + `theme-toggle` + `page-skeleton`                                                                                                                                                                                                                                                                                                                           | 1×                  | **extract** — implements a written MANDATORY standard (the 1× exemption)                                                                             |
| `test-layout-standard`, `test-type-scale`, `test-ui-pattern-lock`, `test-no-emoji`                                                                                                                                                                                                                                                                                                                                         | 1× each             | **extract** — they _are_ platform rules; see the migration warning below                                                                             |
| `lib-db`                                                                                                                                                                                                                                                                                                                                                                                                                   | 3×                  | extract (Phase 1)                                                                                                                                    |
| `config-vitest` (`vitest.config.ts` + `vitest.setup.ts`), `config-eslint`, `config-prettier`                                                                                                                                                                                                                                                                                                                               | 3-4× identical      | **extract**                                                                                                                                          |
| `lib-action-result` + `action-toast` + `hook-server-action`                                                                                                                                                                                                                                                                                                                                                                | 1× (sakubun)        | **defer** — 1× and coupled to each app's own result shape; extract when `todo` or `journal` adopts the shape                                         |
| ~~`hook-fit-rows`~~ **NOT extracted 2026-07-29** — checked during execution: the registry's `data-table` does not import it (that is sakubun's local variant), so the "it is already a dependency" exemption does not apply and it stays at 1×. Revisit at a 2nd consumer                                                                                                                                                  | 1×                  | **deferred, on the rule**                                                                                                                            |
| ~~tone tokens `--ok/--warn/--alert`~~ **NOT extracted 2026-07-29** — the three apps use the same token NAMES with **different values** (`--ok` is `0.58 0.13 155` in todo, `0.535 0.13 155` in sakubun, `0.55 0.13 150` in yakudoku). What is shared is the naming contract, i.e. a rule — it is **read**, not installed, so by this plan's own axis it stays in `platform/`. Shipping one palette would fork on first use | 3× names, 0× values | **deferred — belongs to `platform/`, not here**                                                                                                      |
| `hook-fit-rows` (`fit-rows.ts` + `use-fit-rows.ts`)                                                                                                                                                                                                                                                                                                                                                                        | 1×                  | extract **only** as a declared dependency of `data-table` (already in the registry and needs it)                                                     |
| tone tokens `--ok/--warn/--alert`                                                                                                                                                                                                                                                                                                                                                                                          | 3× per catalog      | extract as a CSS/theme item                                                                                                                          |
| forward-auth header reader                                                                                                                                                                                                                                                                                                                                                                                                 | 3× per catalog      | **verify shape first** — `sakubun` moved to better-auth and the NUC is down; re-count before extracting                                              |
| `confirm-dialog`, `search-input`, `filter-popover`, `copy-command-button`, `relative-time`, `motion-primitives`, `expanding-icon-button`, `section-tag`, `use-session-state`, `use-paged-list`                                                                                                                                                                                                                             | 1× each             | **deferred list — do NOT extract now.** Generic-looking but single-use; premature coupling is the failure mode the catalog already documents 6 times |

- [x] 2.1 — `block-app-frame` (+ its registry deps) · Files: Create `registry/block/{page-shell,app-shell,page-skeleton,theme-toggle}.tsx` + `registry/block/registry.json` (from `sakubun/components/shell/`) ·
      Test: `AC-1` + install into a scratch Next app, a page renders inside the shell at the standard width
- [x] 2.2 — `config-vitest` / `config-eslint` / `config-prettier` as universal items · Files: Create `registry/config/*` ·
      Test: `AC-1` + install into `journal`, `npm test` + `npm run lint` unchanged
- [x] 2.3 — the 4 `test-*` gates, each shipping a **seeded exception list** · Files: Create `registry/test/{no-emoji,layout-standard,type-scale,ui-pattern-lock}.test.ts` ·
      Test: `AC-8` (install `test-no-emoji` into `journal` — 1 offending file → red → clean → green)
- [~] 2.4 — `hook-fit-rows` + tone tokens · Files: Create `registry/hook/{fit-rows.ts,use-fit-rows.ts}`, `registry/theme/tone-tokens.css`, Modify `registry/thiengthb/data-table.tsx` deps ·
  Test: `AC-1` + a `data-table` install resolves its deps with no manual step
- [x] 2.5 — Update `platform/registries/shared-assets.md` rows to REGISTRY + canonical path **in the same commit** (`/code-reuse` law) ·
      Files: `platform/registries/shared-assets.md` · Test: `/code-reuse` audit mode reports no drift

> **Migration warning:** installing an enforcement test into an existing app is a **migration, not a copy** — measured
> today: 14 files would fail `no-emoji` (`todo` 6, `journal` 1, `yakudoku/web` 7). Budget the cleanup per app, or install
> with the offenders seeded into the exception list and burn them down.

### Phase 3 — the starter (the actual "start a project faster" deliverable)

- [ ] 3.1 — `starter-web-app` (universal item, `registryDependencies` → the Phase-2 items) · Files: Create
      `registry/starter/**` landing `tsconfig.json`, `eslint`/`prettier`/`vitest` configs, `.dockerignore`, `Dockerfile`
      (EXPOSE + HEALTHCHECK), `docker-compose.yml` (target `local`, **named volume**), `.github/workflows/deploy.yml`,
      `scripts/rebuild-and-verify.sh`, `lib/db.ts`, `lib/utils.ts`, `docs/00-map.md` + `docs/decisions.md` stubs,
      `app/guide/page.tsx` stub · Test: `AC-1` + `AC-10`
- [ ] 3.2 — **Acceptance (run-it-and-see, this is the whole point):** in a scratch dir, `shadcn init --template next` +
      `shadcn add @thiengthb/starter-web-app` → `npm run build` + `npm test` + `docker compose up -d` ·
      Files: a scratch dir outside the repo, deleted after; `docs/decisions.md` (the wall-clock) ·
      Test: `AC-9` (healthy + HTTP 200, wall-clock recorded)
- [ ] 3.3 — The starter must NOT write governance files. `CLAUDE.md`, `.claude/**` and `.env*` are gate-blocked for the
      agent (autonomy contract) — the starter ships `docs/` stubs + a README pointer and leaves `CLAUDE.md` + secrets to
      `/app-onboard` + `/app-env` · Files: `registry/starter/registry.json` (the `files[].target` list) ·
      Test: `AC-10` (grep the targets for `CLAUDE.md|\.claude/|\.env` ⇒ 0)

### Phase 4 — make it get USED, and detect the forks (the copy-in tax)

- [ ] 4.1 — Declare the `@thiengthb` registry in every consumer's `components.json` (`todo`, `journal`, `yakudoku/web`,
      `sakubun`) + document the shadcn MCP route · Files: `<app>/components.json`, `commons/README.md` ·
      Test: `npx shadcn view @thiengthb/page-header` resolves from each repo
- [ ] 4.2 — The gate half (per constraint 1): extend the existing `/code-reuse` + `ui-pattern-lock` machinery so writing
      a file whose basename matches a registry item warns "commons ships this — `shadcn add` instead" · report-only first ·
      Files: `.claude/skills/code-reuse/**` (a human installs any hook — governance is gate-blocked for the agent) ·
      Test: `AC-11` (create `components/empty-state.tsx` in a scratch repo ⇒ warning fires)
- [ ] 4.3 — Create `commons/scripts/audit-consumers.mjs`: for each consumer repo, compare the installed copy against the
      registry source → `CLEAN | STALE | FORKED` + line delta. **Report-only** · Files: Create `scripts/audit-consumers.mjs` ·
      Test: `AC-12` (the 2026-07-19 `empty-state` fork is the known-positive fixture)

### Phase 5 — non-JS whole-repo scaffolding (do not start before the trigger fires)

- [ ] 5.1 — python-worker starter (`nuc-monitor`/`nuc-ops-bot` shape: Discord bot bootstrap + `ruff`/`mypy`/`bandit` +
      Dockerfile + compose) · **Trigger: a 3rd same-shape Python repo is actually being created.** Mechanism = Option B
      (Copier) or a plain `platform/templates/python-worker/` + `degit`; decide at the trigger, not now — `shadcn` cannot
      initialize a non-JS repo, which is the one thing Option A genuinely can't do ·
      Files: undecided until the trigger fires · Test: the new repo reaches lint+test+container-healthy from the template alone

## Out of scope

- **Rule prose does not move into `commons`** — standards/law stay in `platform/**`, generation-time rule delivery stays
  `rulebook`'s job. Only _executable_ enforcement ships as an item.
- Publishing anything to npm (except the already-decided MCP-OAuth-shim path in `shared-assets.md`).
- Monorepo conversion; a hosted registry site; auth'd/private registry.
- Retro-fitting every existing app onto the starter. The starter serves **new** repos; existing apps adopt items one at
  a time, on their own schedule.

## Open questions / risks

1. **Junk drawer / premature coupling.** Storing "everything reusable" produces a folder nobody reads — and 6 catalog
   rows already show the 3rd consumer often never arrives. Mitigation: the Phase-2 verdict table (with an explicit
   deferred list) + the 2026-08-26 usage check-in with its failure branch pre-committed below.
2. **Copy-in drift multiplies with volume.** More items ⇒ more silent forks (`empty-state` already forked once).
   Mitigation: 4.3 ships in the same phase as the extractions, never "later".
3. **Enforcement tests land red.** 14 known failures today; a distributed gate that everyone disables is worse than no
   gate. Mitigation: seeded exception lists + burn-down, per app, as its own commit.

## Check-in runbook — 2026-08-26 (owner: supervisor)

Answers one falsifiable question: **did the widened registry get used, or did we build a shelf?**

1. `cd commons && git log --since=2026-07-29 --oneline -- registry/ | wc -l` — items added since this plan.
2. For each consumer (`todo`, `journal`, `yakudoku/web`, `sakubun`): `git log --since=2026-07-29 --oneline` and count
   commits that **install a commons item** (message or diff touching a path shipped by an item).
3. `node commons/scripts/audit-consumers.mjs` (if Phase 4 landed) — record `CLEAN/STALE/FORKED` counts.
4. Read the number: **installs into consumer repos, excluding commons itself.**

| Result           | What it means                         | What it FORBIDS                                                                                                                                                                                                                    |
| ---------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **≥ 3 installs** | the mechanism is real                 | nothing — continue the remaining phases                                                                                                                                                                                            |
| **1-2 installs** | it works but only where it was pushed | Phase 5 does not start; no new extraction until an existing item gets a 2nd consumer                                                                                                                                               |
| **0 installs**   | a shelf, not a surface                | **stop extracting.** Freeze the registry at what is proven, mark the deferred list _rejected_, and record in `docs/decisions.md` that the constraint was demand (project count), not supply — the catalog was never the bottleneck |

Close the loop: write the outcome into this plan, then clear `checkin:` (answered) or roll it forward stating what is
still missing.

## Prior art & sources

- shadcn **registry-item.json** — universal items: _"To make an item universal (i.e. framework agnostic), all the files
  in the item must have an explicit target"_; `~/` = project root; `target` required for `registry:file` / `registry:page`.
  → this is the mechanism that lets one registry ship configs, scripts and tests. https://ui.shadcn.com/docs/registry/registry-item-json
- shadcn **CLI v4** (2026-03) — `registry:base` ships _"an entire design system as a single payload"_ (components + deps
  - CSS vars + config); `shadcn init --template` scaffolds full project templates; `--dry-run` / `--diff` inspect a payload
    and check for registry updates. https://ui.shadcn.com/docs/changelog/2026-03-cli-v4
- shadcn **Registry Include & Validate** (2026-05) — `include: [...]` composes many `registry.json` files into one
  flattened build; `shadcn registry validate` checks schema, duplicate names and local file paths without building.
  → Phase 0.4's CI gate. https://ui.shadcn.com/docs/changelog/2026-05-registry-include
- shadcn **MCP server** — an agent can browse/search/install from _any_ registry declared in `components.json`,
  including private/internal ones. → Phase 4.1, but see constraint 1: an MCP tool only runs if the model chooses to call
  it. https://ui.shadcn.com/docs/mcp
- **Copier vs cookiecutter / golden paths** — the distinguishing feature is `copier update`, which _"merges diffs into
  your existing project if the upstream template changes"_, aimed exactly at "organizational standards that evolve";
  managing many repos otherwise produces configuration drift. → the honest counter-case to copy-in, and why Option B
  survives as the Phase-5 escape hatch.
  https://dev.to/structkit/structkit-vs-cookiecutter-vs-copier-which-project-scaffolding-tool-is-right-for-you-5gag
- **AGENTS.md multi-repo governance** — copying instruction files between repos diverges quietly; teams keep one source
  and sync by script/CI. → why rule _prose_ stays in `platform/` and only executable enforcement ships.
  https://www.morphllm.com/agents-md-guide

## Decisions to distill

- The axis that keeps three homes from overlapping: **installed → `commons`, read → `platform/`, enforced-at-generation
  → `rulebook`.** Content type ("is it a rule?") was the wrong axis; mechanism is the right one.
- Rule-of-three gains **one exemption**: an artifact implementing a written platform standard may be extracted at 1×
  (`PageShell`), because a written standard is not speculative sharing.
- A distributed enforcement test is a **migration**, not a copy — it lands red on accumulated drift (measured: 14 files).
- Measured 2026-07-29: the platform's no-emoji rule was broken in `todo` 6 / `journal` 1 / `yakudoku/web` 7 — a gate that
  lives in one repo does not govern a platform.
- The registry build was **not reproducible across machines**: `public/r/*.json` embeds the source _as a string_, so the
  committed artifacts carried CRLF from the Windows box and 11/15 rebuilt differently on Linux. A build whose output is
  committed needs `.gitattributes` before it needs a CI gate — otherwise the gate fails on the machine, not on the change.
