# commons — Map

> One sentence: the fleet's shared **shadcn registry** — 27 installable artifacts (UI, helpers, configs, an ops
> script, two rules-as-tests, and a whole-app starter) distributed **copy-in**
> (consumers run `shadcn add` and own the code). `kind`: `meta`, `target`: `none` — NOT deployed (no Docker, no
> CI deploy, no Traefik). Path `<repo-root>/commons`, its own git repo `thiengthb/commons`.

## 1. Essence

Build the reusable thing **once**, then install it. Components proven in an app are extracted here so every other
frontend copies them in rather than re-deriving them (shadcn philosophy: components are code you own, not an npm
dependency). No server, no image, no pipeline.

Scope is defined by **mechanism, not content type**: what a consumer **installs** (a file lands in their repo)
lives here; what a consumer **reads** to decide (law, standards, catalogs) stays in `platform/`; what is enforced
at generation time stays `rulebook`'s. So an executable rule ships as an item (`test-no-emoji`) while the prose it
enforces does not move. The widening from 15 UI components to 27 artifacts across 7 layers was
`docs/plans/2026-07-29-commons-install-surface.md` (phases 0-4 done 2026-07-30).

**External** patterns are the one thing that does NOT come in here: several community shadcn registries
resolve with no config at all, so they are referenced on demand rather than vendored. Verdicts + the four
pre-install gates: `docs/external-patterns.md`.

Only stable, product-agnostic items belong here; per-app UI stays in its app.

## 2. Stack

| Layer   | Tech                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| Tooling | `shadcn` CLI (verified 4.16.0 on 2026-07-29) — devDependency only; `prettier`                                      |
| Format  | TypeScript + TSX, shadcn `new-york` style, Tailwind CSS vars, `rsc: true`                                          |
| Build   | `registry.json` (source of truth) → `shadcn build` → `public/r/<name>.json` (self-contained, what consumers fetch) |
| Deploy  | **none** — `private: true`, no Dockerfile, no `deploy.yml`, no `.env`                                              |

## 3. Module map / entry points

```
registry.json            ROOT manifest: 15 UI items + `include` of the six layer manifests below (27 items total)
registry/thiengthb/      the 15 UI item sources (kebab-case filenames, PascalCase exports)
registry/lib/            lib-db — the Prisma singleton · lib-env — fail-fast zod env validation
registry/script/         script-rebuild-and-verify — a UNIVERSAL item: installs into a repo with no components.json
registry/config/         config-vitest · config-eslint · config-prettier · config-editorconfig
registry/block/          page-shell (the MANDATORY page frame, all slots, no next/*) · theme-toggle
registry/test/           test-no-emoji · test-ci-hardening — platform rules shipped as failing tests
registry/starter/        starter-web-app — the whole web-app spine (Dockerfile, compose, CI, health, doc stubs)
components.json          shadcn config for THIS repo (new-york, Tailwind neutral, @/ aliases)
package.json             @thiengthb/commons, private:true — registry:build · validate · readme[:check] · audit · format[:check]
.gitattributes           pins LF everywhere — load-bearing: the build embeds source AS A STRING (see §5)
README.md                consumption guide (local path vs namespaced registry) + authoring guide + gotchas;
                         its item table is GENERATED — never hand-edit between the markers
scripts/gen-readme.mjs   regenerates that table from registry.json + lints item metadata (--check for CI)
scripts/audit-consumers.mjs  where each consumer stands vs the registry: CLEAN/STALE/PROSE/FORKED/DELIBERATE/ADAPTED
public/r/<name>.json     BUILT output (embedded source) — committed, this is what `shadcn add` fetches
.github/workflows/       registry.yml (validate → readme:check → build → fail if public/r is dirty)
docs/                    00-map.md · decisions.md · divergences.json (declared, reasoned forks) · plans/
docs/external-patterns.md  what was taken FROM the web and what was refused — the 8 zero-config community
                         registries with per-namespace verdicts, the 4 pre-install gates, and sources
```

Two tools live OUTSIDE this repo because they reason across the whole fleet, not about one registry:
`.claude/scripts/reuse-scan.mjs` (is a shape being built in 2-3 projects? applies the rule of three) and
`.claude/hooks/reuse-guard.mjs` (a PreToolUse gate: writing a new file that an item already ships).

## 4. Main flows

1. **Author**: add `registry/thiengthb/<name>.tsx` → add an entry to `registry.json` (`dependencies` npm,
   `registryDependencies` shadcn primitives or **namespaced** `@thiengthb/*`, `files[].target`) →
   `npm run registry:build` → `npm run readme` → commit `public/r/` **in the same commit**.
2. **Consume — local path** (same machine): `npx shadcn add ../commons/public/r/truncate.json`. Transitive
   `@thiengthb/*` deps are NOT resolved on this path — add them first.
3. **Consume — namespaced registry** (any machine, and how an agent reaches it via the shadcn MCP server): declare
   `"@thiengthb": "https://raw.githubusercontent.com/thiengthb/commons/main/public/r/{name}.json"` in the
   consumer's `components.json`, then `npx shadcn add @thiengthb/data-table` (deps resolve automatically).

## 5. Highlights

- **The build output is line-ending-sensitive.** `public/r/*.json` embeds each item's source as a JSON string, so
  a build on Windows (where `core.autocrlf` checks LF blobs out as CRLF) bakes `\r\n` into the artifact and hands
  consumers CRLF files. Measured 2026-07-29: 11 of 15 artifacts carried it. `.gitattributes` (`eol=lf`) is what
  makes the build byte-identical across machines — and therefore gateable in CI.
- **`script-rebuild-and-verify` asserts `$BASH_VERSION` and refuses otherwise.** Its route sweep is
  `for route in $ROUTES`, which bash word-splits and **zsh/dash do not** — so under the wrong shell it curls one
  nonsense URL and can still print green. A shebang is advisory (`zsh script.sh` ignores it), and the one failure mode a
  verification tool may not have is a silent PASS.
- **An un-rebuilt edit ships nothing.** `data-table` went two commits (`b06b815`, `171ae18`) with source changes
  that never reached `public/r/data-table.json`, so `shadcn add data-table` kept delivering the old component.
- **A bare `registryDependency` resolves against the DEFAULT shadcn registry** — `data-pagination` (ours) written
  without the `@thiengthb/` namespace made a `data-table` install fail; `readme:check` now catches that class.
- **Copy-in means fixes don't auto-propagate** — consumers re-run `shadcn add` for important patches. Detecting
  the resulting forks is Phase 4 of the active plan (`scripts/audit-consumers.mjs`).
- `page-header`, `app-sidebar`, `breadcrumbs` are **Next-only** (`next/link` / `next/navigation`).
- **`date-picker` → shadcn `calendar` → `react-day-picker`**: the calendar template must match the installed
  major (v8 vs v9/v10 API differ).

## 6. Invariants

- **NOT deployed** — never add a Dockerfile, `deploy.yml`, Traefik label, or `.env`. `private: true`, never published to npm.
- **Every edit to `registry/**` or `registry.json` ⇒ `npm run registry:build` + commit `public/r/`** — enforced by
  `.github/workflows/registry.yml`, not by memory.
- **The README item table is generated** — edit `registry.json`, run `npm run readme`; never hand-edit inside the markers.
- **Item `title` + `description` are required and written in ENGLISH** — they are what `shadcn view` and the shadcn
  MCP server show an agent in another repo. Enforced by `readme:check`.
- **A sibling item is referenced as `@thiengthb/<name>`**, never bare.
- **Naming**: PascalCase React exports, **kebab-case filenames** (`date-picker.tsx`).
- **Only product-agnostic, stable items** — the `/code-reuse` rule of three, with one exemption: an artifact
  implementing a **written platform standard** may be extracted at first use.
- **Nothing from an external registry is ever VENDORED into here.** External components are reached on
  demand (`npx shadcn add @reui/x` — several community namespaces resolve with no config at all) and pass
  the four gates in `docs/external-patterns.md §2` first. A web pattern has zero uses in the fleet, so
  copying it in inverts the rule of three. External _rules and configs_ are a different case and ARE
  imported — `config-editorconfig`, `lib-env`, `test-ci-hardening` all came from published standards.
- **Keep `platform/registries/shared-assets.md` in sync** in the same change when the item list changes.

## 7. Secrets / env

None — no runtime, no `.env`, no credentials.

## 8. Further reading

- Consumption + authoring + gotchas: `README.md` · why copy-in / registry-first: `docs/decisions.md`
- **Active plan**: `docs/plans/2026-07-29-commons-install-surface.md` (`status: active`, check-in 2026-08-26)
- Shared-asset catalog: `platform/registries/shared-assets.md` (owned by `/code-reuse`) · UI law:
  `platform/standards/ui-layout.md` + `/react-ui-craft`
