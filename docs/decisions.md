# Knowledge log — commons

> Architecture decisions + the _why_, recorded so the next session doesn't re-derive them. Append-only,
> **newest on top**. Standard: `platform/standards/documentation.md §5`. Record only the non-obvious.

---

## 2026-07-30 — a verification script whose failure mode is a FALSE PASS must refuse, not guess

**Context:** `rebuild-and-verify.sh` ships from this registry into every repo and ends with a route sweep:
`for route in $ROUTES`. That relies on the shell word-splitting an unquoted parameter.

**Pitfall:** **bash splits it, zsh and dash do not.** Under zsh, `ROUTES="/ /settings /guide"` stays ONE word, so the
sweep curls a single nonsense URL, gets a 404, and — depending on the config — can still print a green summary having
verified nothing. The shebang says bash, but a shebang is advisory: `zsh scripts/rebuild-and-verify.sh` ignores it.

**Decision:** assert `$BASH_VERSION` at the top and **exit 1 with the reason** rather than proceed. Verified by running
it: zsh, sh and dash all exit 1; bash passes the guard and then fails for the real reason (no app), which proves the
guard does not false-positive. `todo`'s installed copy had the same unguarded loop and was re-synced (audit: CLEAN).
`sakubun`'s deliberate fork was checked and has **no** splitting-dependent loop, so it was left alone.

**Why an assertion and not a comment:** for most scripts the wrong shell produces an error and you notice. Here it
produces a **pass**. A tool whose entire value is being trusted when it says green cannot have a silent-success failure
mode; the only safe behaviour is refusal. This is the same class as the audit's `selfCheck()` — a check that prints
nothing on success cannot be distinguished from a check that ran on an empty set.

**How it was found:** not by review. A CI poller written in bash idiom (`set -- $out`) ran 40 pointless iterations under
zsh because `$1` held the whole line; chasing that bug surfaced the shipped script. The zsh/bash splitting table lives
in `CLAUDE.local.md` (machine tier — the NUC and the Windows box do not run zsh).

**Related:** `registry/script/rebuild-and-verify.sh:36` · `platform/registries/shared-assets.md` (rebuild-and-verify row)

---

## 2026-07-30 — external patterns are REFERENCED, not vendored; external RULES are imported

**Context:** the standing request was to find good, generic, reusable patterns _on the web_ — and the
closing check of `plans/2026-07-29-commons-install-surface.md` had named it a MISS, because all 24 items
so far came from this fleet's own code.

**Decision — split the request in two, and answer each differently.**

- **Component code from the web is never copied into this registry.** Copy-in is permanent (upstream
  fixes never arrive); the rule of three would be inverted (a web pattern has **zero** uses here, so the
  catalog would start predicting demand instead of recording it); and it would corrupt the 2026-08-26
  check-in, which asks whether any _proven_ item ever got installed — padding the catalog first makes a
  null result unreadable.
- **Rules, configs and gates from the web ARE imported**, because grounding a standard in this agent's
  own opinion is exactly the failure `research-before-design` exists to prevent.

**Why the first half is not a refusal:** the shadcn CLI already resolves several community registries
with **no configuration at all** — measured with `search`: `@shadcn` 471 items, `@reui` 1596,
`@animate-ui` 580, `@aceternity` 270, `@magicui` 247, `@ai-elements` 136, `@basecn` 56, `@prompt-kit` 23.
So an external component is one command away _on demand_, keeps its author's provenance, and leaves
nothing dead here. What was missing was never a copy — it was knowing the namespaces exist plus a rule
for when to reach for one. Full verdicts + the four pre-install gates: `docs/external-patterns.md`.

**The uncomfortable part of the finding:** of those eight, exactly **one** (`@reui`) is a real candidate,
and only per-item — `@reui/data-grid` pulls `@base-ui/react`, a _second_ primitive library beside Radix.
Three of the largest are animation/marketing libraries, which this platform's own minimal-UI rule would
require arguing back out. The ceiling on reuse here is not catalog size.

**What the imported rules turned into**, each measured against the fleet _before_ being built:
`config-editorconfig` (0 of 10 repos had one), `lib-env` (0 of 10 validated their environment),
`test-ci-hardening` (0 of 8 workflows declared top-level `permissions`; 0 pinned any action by SHA across
44 `uses:` sites), and capability/privilege hardening in the starter's compose.

**Related:** `docs/external-patterns.md` (verdicts + sources) · `registry/test/ci-hardening.test.ts` ·
`registry/lib/env.ts` · [[2026-07-29 — the registry carries ANY file, so installed-vs-read is the scope line]]

---

## 2026-07-30 — the EditorConfig/Prettier overlap makes a "harmless" config file load-bearing

**Context:** adding a `.editorconfig` looked like the most trivial item in the registry.

**Pitfall:** **Prettier reads `.editorconfig`.** For `endOfLine`, `tabWidth`, `useTabs` and `printWidth`,
an option absent from `.prettierrc` is filled in from EditorConfig, while an option present there wins.
So two configs that disagree make a file's formatting depend on whether the editor or `prettier --write`
touched it last — the exact flip-flopping diff noise the shared Prettier config exists to eliminate.
Shipping an EditorConfig with plausible-but-different values would have been **worse than shipping none**.

**Decision:** `config-editorconfig` restates the `config-prettier` contract exactly (LF, 2 spaces, width 100) and says in the file that it must be kept in agreement. Two carve-outs are deliberate:
`trim_trailing_whitespace = false` for Markdown (two trailing spaces are a hard line break, so trimming
silently rewrites the document) and `indent_style = tab` where a tab is syntax, not style.

**Related:** `registry/config/editorconfig.txt` · `registry/config/prettierrc.json`

---

## 2026-07-30 — the CI gate's first finding was in an artifact this repo had just shipped

**Context:** `test-ci-hardening` was written from external guidance, then run against fixtures — one of
which was `starter-web-app`'s own `deploy.yml`, written and reviewed earlier in the same work pass.

**Finding:** it had no **top-level** `permissions:`. Only the `build` job declared any, so the `test` job —
the one that runs `npm ci`, i.e. arbitrary dependency postinstall scripts — inherited whatever token scope
the repository defaulted to, which on an older repo is read/write. Reviewed by a human who knew the rule,
and still wrong, in the artifact meant to be the reference. Across the fleet: **0 of 8** workflows had it.

**Why this is the argument for gates over prose, again:** this is now the second measured instance of the
same shape (the first was the no-emoji rule, written down and broken in 14 files across three apps that
all had the prose). A rule stated in a document is a reminder; the same rule as a failing test is the only
version that finds the case its own author missed.

**Two judgement calls recorded so they are not mistaken for facts:** `trustedOwners` exempts `actions`,
`github` and `docker` from SHA pinning because published guidance targets _third-party_ actions and
pinning first-party namespaces forfeits automatic patches — `"strict": true` in `docs/gates.json` takes the
stronger position. And the fleet's own 8 workflows are **not fixed** by this: `.github/workflows/**` is
governance the agent may not edit, so that remains a human commit.

**Related:** `registry/test/ci-hardening.test.ts` · `registry/starter/github-workflows/deploy.yml` ·
`registry/starter/docs/gates.json`

---

## 2026-07-30 — a repo-layout change degraded two tools SILENTLY, in the same shape

**Context:** the nine app repos moved from the repo root into `projects/`. Nothing errored. Two of the
tools built the day before quietly started answering a smaller version of the question:
`reuse-scan` found **0 of 22** duplicate groups (its `projects()` read the root's immediate children), and
`audit-consumers` found **87 of 97** installed files — dropping `projects/yakudoku/web` entirely, because a
monorepo root carries no `package.json` and therefore needed a third level of descent. Worse,
`audit-consumers` reported **0 of 4** declared divergences: the reasons in `docs/divergences.json` were
still there, but keyed on the bare project name (`sakubun::lib/db.ts`) while the walker now yields
`projects/sakubun`, so four deliberate decisions came back as FORKED.
**Decision:** discover by SHAPE, never by a folder name. A parallel session added
`.claude/scripts/_layout.mjs` — a directory is a project if it _looks_ like one (`.git`, `docs/`,
`package.json`, `plans/`), otherwise it is a container and gets descended into — and the same reasoning was
applied inside `commons`: two container levels rather than one, and tail-matching for both the
`--calibrate` fixtures and the divergence keys.
**Why it matters more than the fix:** a tool that crashes gets fixed in a minute; a tool that returns a
plausible smaller number gets _believed_. "No cross-project duplication found" was printed with total
confidence while the scan was looking at four directories. Any tool that enumerates repos on this platform
must be re-run after a layout change, and its output compared against a known count — for these two the
known counts are 22 groups and 97 files.
**Watch out:** `platform/`'s marker is `plans/` — it is not a git repo and has no `docs/`, so a marker set
that omits it silently reclassifies it as a container and makes every platform plan invisible to
`plan-checkin`.

## 2026-07-29 — the starter is real, and running it once found three shipping bugs

**Context:** `starter-web-app` bundles the whole web-app spine (Dockerfile, compose, ghcr workflow, health
route, standalone next.config, verify config, doc set) and depends on the config/script/gate items.
**Measured, end to end, on a throwaway app:** `shadcn init --template next --base radix --preset nova` 37s →
`shadcn add @thiengthb/starter-web-app --yes --overwrite` lands **15 files** → `npm run build` 5s, vitest
green, eslint clean → `bash scripts/rebuild-and-verify.sh` took it from no image to **healthy + HTTP 200 in
44s**. Under three minutes total, two commands typed. The volume landed as `scratch-app_app_data` — the
compose project name carries the app's name, so a single `app_data` key in the file is still per-app in reality.
**Why the run mattered more than the artifact — three things it caught that review had not:**

1. **`@vitejs/plugin-react` made the starter uninstallable.** Its 6.0.4 wants `@babel/core` 8 and collides
   with the `shadcn` CLI's own Babel 7 pin; npm refused outright (`todo` is fine only because it has no
   `shadcn` dependency). Dropped from `config-vitest` — Vite transforms TSX through esbuild anyway; add it the
   day a repo writes React component tests.
2. **A registry item cannot merge a script into `package.json`.** `npm test` simply does not exist in a fresh
   scaffold, so the shipped workflow and gate commands call `npx vitest run` / `npx prettier --check .` and the
   two convenience scripts are documented instead of assumed. This is the one thing the mechanism cannot do.
3. **`verify.env` was renamed `verify.conf`.** It holds no secrets, but a name ending in `.env` reads as if it
   does, and one `*.env` line in a `.gitignore` would have made the config silently uncommittable.

**Also learned about the install path:** a **local JSON path cannot resolve `@thiengthb/*`
registryDependencies** — the namespace has to be declared in the consumer's `components.json`, and the value
must be a real HTTP URL (a bare filesystem path is resolved against `ui.shadcn.com`; `file://` returns "not
implemented... yet"). So a multi-item bundle needs Approach B, and local iteration on it needs a throwaway
static server over `public/r`. `--overwrite` is right on a fresh scaffold and **wrong on a living app** — it
also refetches the shadcn primitives listed as registry deps, which on `todo` restyled `button.tsx` and
`switch.tsx` and undid the repo's Prettier formatting.

## 2026-07-29 — the registry carries ANY file, so "installed vs read" is the scope line

**Context:** `commons` held 15 UI components while everything else reusable on the platform was stranded in
one app — `PageShell` (a MANDATORY standard), the four convention-gate tests, the Prisma singleton (3×), the
identical vitest/eslint configs (3-4×), the ops scripts. The tempting fix was "put all the reusable stuff,
including the rules, in commons".
**Decision:** widen the registry to every artifact class, but draw the boundary by **mechanism, not content
type** — what a consumer **installs** (a file lands in their repo) lives here; what a consumer **reads** to
decide (law, standards, catalogs) stays in `platform/`; what is enforced at generation time stays `rulebook`'s.
So an executable rule (a vitest gate, a hook script, a config) ships as an item, while the prose it enforces
does not move. Plan: `docs/plans/2026-07-29-commons-install-surface.md`.
**Why:** rule prose in two places is the failure this platform keeps re-learning — a fact that governs
behaviour belongs where it is read. Mechanism is also the axis the tool already understands: a **universal
item** (type `registry:item`, every file carrying an explicit `~/`-rooted `target`) installed into a
**completely empty directory** — no `components.json`, no `package.json`, no React — which is what makes one
mechanism enough for configs, scripts, CI files and tests across every repo, including non-JS ones.
**Watch out (measured, not assumed):**

- An **`include`d registry file declares `files[].path` relative to ITSELF**, not the repo root — the docs'
  "preserving original file paths" reads the other way, and repo-root paths fail validation.
- **The executable bit is not preserved.** A shipped `.sh` arrives `rw-r--r--`, so it is invoked as
  `bash scripts/…` (documented in the script's own header) or chmod'd by the consumer.
- **`lib-db` must never be blind-installed into `sakubun`** — its `lib/db.ts` is 92 lines carrying the
  fail-closed tenancy guard (invariant #5), not the 8-line singleton. An identical filename across apps does
  not mean an identical file.
- A generic ops script only stays generic if the per-repo values live **outside** it (`scripts/verify.env`),
  otherwise every consumer edits the copy and the fork count grows.

## 2026-07-29 — the build output is line-ending-sensitive, which made it un-gateable

**Context:** `shadcn build` embeds each item's source **as a JSON string** into `public/r/<item>.json`. Every
tracked file was LF in the index, but on Windows `core.autocrlf` checks those blobs out as CRLF, so a build
there baked `\r\n` into the embedded content. 11 of 15 artifacts carried it; the 4 built on Linux did not.
**Decision:** `.gitattributes` with `* text=auto eol=lf` (+ `*.sh text eol=lf`), then rebuild everything.
**Why:** two failures, not one. Consumers were handed CRLF source for `truncate` and LF for `data-table` from
the same registry; and the "every edit ⇒ rebuild" invariant could not be enforced in CI, because
`git diff --exit-code public/r` would go red on a **machine switch** rather than on a stale artifact. Pinning
line endings is what made the gate possible — the gate then immediately caught `data-table.json` being
genuinely stale for two commits (`b06b815`, `171ae18`), i.e. `shadcn add data-table` had been shipping a
component without its own bug fix.
**Watch out:** Prettier and a generator both writing the same file will fight. `npm run readme` therefore
chains `prettier --write README.md`, and `readme:check` compares the table's **content** (whitespace-collapsed)
rather than its bytes — a byte comparison reports "stale" forever once Prettier pads the columns.

## 2026-07-19 — `EmptyState` gained a `children` slot instead of a second component

**Context:** sakubun independently built its own `components/empty-state.tsx` (a `children`-only box) during
its P2 reuse pass, not noticing the registry already shipped `empty-state` with a structured
`icon`/`title`/`description`/`action` API. Two components, one name, one look — a fork.
**Decision:** extend the canonical with an optional `children` slot (and relax `title` to optional) rather
than register a second variant; sakubun then adopted the canonical as a copy-in. `children` renders as a
**direct child**, not inside a wrapper `<div>`, and passing it also mutes the container text.
**Why:** sakubun's copy exists because its empty-state copy is rich inline JSX (`<code>`, `<em>`, an embedded
`<ImportDialog />`) that doesn't fit a `title: string`. The wrapper matters: three sakubun call sites style
the box as a flex stack (`flex flex-col items-center gap-4`), and wrapping the children would make them one
flex item, silently collapsing the gap. The change is **strictly additive** — every existing consumer
(`todo` 8 sites, `journal`) keeps rendering identically, so no copy-in needs re-syncing to stay correct.
**Watch out:** the canonical's default padding is `px-6 py-16`, sakubun's fork was `p-8` — adopting it means
call sites relying on the old default need an explicit `p-8` or the box visibly grows.

## 2026-06 — Copy-in distribution (shadcn registry), not a published npm package

**Context:** several MiniServer frontends need the same components; how to share across independent repos?
**Decision:** a shadcn **registry** distributed **copy-in** — `registry.json` → `shadcn build` → `public/r/*.json`; consumers `npx shadcn add` to copy the source into their repo (and own it). Registry-first (not raw file copy) so `registryDependencies` resolve transitively (e.g. `page-header` pulls `info-hint`) with the right npm deps + target path.
**Why:** each project is an independent repo + image; a published package would need a private npm registry, a publish pipeline, and coordinated version bumps across all consumers. Copy-in decouples the registry from consumer release cycles and matches the shadcn philosophy (components are code you own). **Trade-off:** bug fixes don't auto-propagate — consumers re-run `shadcn add` for important patches.
**Related:** `registry.json`, `README.md`, `platform/registries/shared-assets.md`, [[link-manager-golden-ref-dangling]].

## 2026-06 — Only product-agnostic, stable, ≥3×-reused components belong here

**Context:** it's tempting to dump every nice component into the shared kit.
**Decision / Pitfall:** only stable, product-agnostic, reused-across-projects components are extracted; per-app UI (`streak-chip`, `mood-picker`, `day-nav`) stays in its app. `page-header` is Next-only (`next/link`); `date-picker`'s shadcn `calendar` template must match the installed `react-day-picker` major (v8 vs v9/v10 API differs).
**Why:** premature extraction couples projects to a shared shape that isn't actually shared (the rule-of-three from `/code-reuse`). Keep the glue shared, keep the feature local.
**Related:** `registry/thiengthb/`, `/code-reuse`, `/react-ui-craft`.

---

_(Add new decisions above this line, newest on top.)_
