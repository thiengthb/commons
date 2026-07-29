# External patterns — what was searched for, what was taken, what was refused

> Written 2026-07-30 to answer a standing request: _find good, generic, reusable code patterns on the
> web, and good rules for developing a software project._ Every earlier item in this registry came from
> this fleet's own code, so "and on the web" was an open gap, named as a MISS in
> `plans/2026-07-29-commons-install-surface.md`.
>
> This file is the **verdict list**, not a survey. It records what was measured, what was adopted, and —
> at least as important — what was refused and why, so the same candidate is not re-evaluated from
> scratch in six months.

## 1. The decision that shapes everything below

**External component code is REFERENCED, never vendored into this registry.** Four reasons, in
descending order of how much they cost when ignored:

1. **Copy-in is permanent.** An item in `commons` is code this platform owns and maintains forever;
   upstream fixes never arrive. That price is worth paying for a component already proven in an app
   here. It is not worth paying for one nobody here has used.
2. **The rule of three would be inverted.** An item is extracted when 2–3 projects have independently
   built the same shape. A pattern from the web has **zero** uses in the fleet, so vendoring it means
   the catalog starts predicting demand instead of recording it.
3. **It would corrupt a measurement already in flight.** The plan's 2026-08-26 check-in asks whether
   _any_ of the 24 proven items got installed into an app. Padding the catalog with unproven items
   before that date makes a null result unreadable.
4. **Provenance and licence travel with copied code**, into every repo that installs it, with no record
   of where it came from.

**What replaced vendoring:** the shadcn CLI already resolves a set of community registries with **no
configuration at all**. So an external component is one command away _on demand_, keeps its author's
name, and leaves nothing dead in `commons`. What was missing was never a copy — it was knowing the
namespaces exist and having a rule for when to reach for one.

## 2. External component registries — measured, not quoted

Probed 2026-07-30 with `npx shadcn@latest search @<ns>`, CLI 4.16.0, in a repo with **no** `registries`
block in `components.json`. "Resolves" means it worked with zero setup.

| Namespace                                                     | Items | Licence | Verdict for this fleet                                                                                                                                                                                      |
| ------------------------------------------------------------- | ----- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@shadcn`                                                     | 471   | MIT     | **The baseline.** Already in use.                                                                                                                                                                           |
| `@reui`                                                       | 1596  | MIT     | **Conditional — check deps first.** Large, blocks included, but `@reui/data-grid` pulls `@base-ui/react`, a _second_ primitive library alongside Radix. Take an item only after reading its `dependencies`. |
| `@ai-elements`                                                | 136   | Vercel  | **Only for an AI surface.** `@ai-elements/message` pulls `ai` + `streamdown` + 4 plugins — correct for a chat UI, absurd for anything else.                                                                 |
| `@animate-ui`                                                 | 580   | —       | **No.** See below.                                                                                                                                                                                          |
| `@aceternity`                                                 | 270   | —       | **No.** See below.                                                                                                                                                                                          |
| `@magicui`                                                    | 247   | MIT     | **No.** See below.                                                                                                                                                                                          |
| `@basecn`                                                     | 56    | —       | **No** — it is Base UI by definition, so adopting it means running two primitive libraries.                                                                                                                 |
| `@prompt-kit`                                                 | 23    | —       | Only for an AI surface, as above.                                                                                                                                                                           |
| `@originui` `@kokonut` `@cult` `@21st` `@v0` `@skiper` `@kit` | —     | —       | Not resolvable without a `registries` entry; not pursued.                                                                                                                                                   |

**Why the three big animation registries are a "no" here, despite ~1100 items between them.** They are
built for marketing pages and design-engineer showcases: spotlight cards, sparkles, device mockups,
moving borders. This platform's own UI rule is the opposite — strip decorative and secondary elements,
"bớt đi" means remove rather than shrink. Pulling from them would import work that then has to be
argued back out. This is a **fit** judgement, not a quality one; all three are well-made.

**Net:** of eight zero-config registries, **one** is a real candidate and it needs a per-item
dependency check. The honest finding is that the ceiling on reuse here is not catalog size.

### The four gates before installing from an external registry

Cheap enough to apply every time, and they are what the table above actually applied:

1. **`shadcn view @ns/item` first** — read `dependencies` and `registryDependencies`. Reject anything
   introducing a second primitive library (`@base-ui/react` next to Radix) or a heavyweight transitive
   set for a small component.
2. **Licence must be named.** MIT/Apache is fine; unknown is not, because the file lands in a repo.
3. **Never `--overwrite` into a living app.** Measured on `todo` this session: it refetches shadcn
   primitives and silently restyles `button.tsx`/`switch.tsx`. Install to a clean path, diff, then move.
4. **Record it.** One row in `platform/registries/shared-assets.md` naming the namespace and item, so
   the next audit does not read it as fleet-authored code with a mysterious style.

## 3. Rules and standards taken from the web — the part that shipped

The other half of the request. Here external sourcing is not merely allowed, it is required: grounding
a standard in this agent's own opinion is the failure mode `research-before-design` exists to prevent.
Each row below was measured against the fleet **before** being built, so none of them is speculative.

| Adopted                                                                                                                                     | Measured gap in the fleet                                                                                          | Shipped as                       |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| EditorConfig, with values reconciled against Prettier                                                                                       | **0 of 10** repos had a `.editorconfig`                                                                            | `@thiengthb/config-editorconfig` |
| Fail-fast, typed env validation (the t3-env pattern, written on plain zod)                                                                  | **0 of 10** repos validated their environment, and every one depends on at least one required variable             | `@thiengthb/lib-env`             |
| GitHub Actions hardening: top-level `permissions`, SHA-pinned third-party actions, no `pull_request_target`, no untrusted context in `run:` | **0 of 8** workflows declared top-level `permissions`; **0 of 8** pinned any action by SHA across 44 `uses:` sites | `@thiengthb/test-ci-hardening`   |
| Container runtime hardening: drop all capabilities, `no-new-privileges`, read-only rootfs                                                   | The starter had a non-root `USER` but no capability or privilege restrictions                                      | `starter-web-app` compose        |

**Three of these were only findable by measuring.** The EditorConfig/Prettier interaction is the
non-obvious one: Prettier _reads_ `.editorconfig` for `endOfLine`, `tabWidth`, `useTabs` and
`printWidth`, filling in whatever `.prettierrc` omits. Two configs that disagree therefore make a file's
formatting depend on whether the editor or `prettier --write` touched it last — so shipping an
EditorConfig whose values contradict the platform's Prettier contract would have been worse than
shipping none.

**The CI gate found its own author's work.** Applied to `starter-web-app`'s `deploy.yml` — an artifact
written and reviewed earlier in the same work pass — it flagged a missing top-level `permissions:`,
which meant the `test` job ran `npm ci` (arbitrary dependency postinstall scripts) with whatever token
scope the repository defaulted to. Fixed in the starter; the same finding is open on all 7 app repos.

### What was verified by running it, not by reading it

- **The CI gate**: 4 fixture workflows. All four rules fire with `file:line`; a hardened fixture with a
  40-hex SHA and an `env:`-passed untrusted title yields **zero** findings. Negative controls both hold —
  shortening a `rulebook-allow` reason to 9 characters makes the exception stop working, and
  `"strict": true` correctly starts failing `actions/checkout@v4`.
- **`lib-env`**: `tsc --noEmit` clean; 4 runtime behaviours pass (lists every missing variable in one
  throw, names the specific validation failure, returns typed values, and `SKIP_ENV_VALIDATION=1` lets a
  no-`.env` build through). Declaring a `NEXT_PUBLIC_` variable without its literal `clientRuntime`
  entry fails to **compile**, naming the variable — the `satisfies` clause converts Next's build-time
  inlining footgun into a compile error.
- **Container hardening**: real image, real container. Healthy, `/` and `/api/health` both 200,
  `CapEff: 0000000000000000` (the process holds no capability at all), `no-new-privileges` active, and
  `SKIP_ENV_VALIDATION` **absent** from the runtime environment — the build-stage scoping works.
  `read_only: true` plus tmpfs on `/tmp` and `/app/.next/cache` also serves 200 with `/app` genuinely
  unwritable; it stays opt-in because that was verified on a bare app and the starter's next documented
  step is Prisma, whose native modules may write outside `/tmp`.
- **Also found by running it:** the starter Dockerfile failed outright on an app with no `public/`
  directory, because `COPY --from=build /app/public` cannot be conditional. One `mkdir -p public` in the
  build stage.

## 4. Refused, with the reason

Recorded so these are not re-litigated:

| Candidate                                                            | Why not                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vendoring components from `@magicui` / `@aceternity` / `@animate-ui` | Decorative by design; conflicts with this platform's stated minimal-UI rule. Reachable on demand if ever wanted.                                                                                                                                                                                                                                        |
| `@base-ui/react` via `@reui` or `@basecn`                            | A second primitive library beside Radix — the parallel-system drift this platform explicitly avoids.                                                                                                                                                                                                                                                    |
| `@t3-oss/env-nextjs` as a dependency                                 | The _pattern_ is worth ~90 lines; the package adds a dependency to every repo for it. Named in `lib-env` as the drop-in upgrade if an app outgrows the file.                                                                                                                                                                                            |
| `commitlint` + `husky` + `lint-staged`                               | The platform already enforces Conventional Commits with its own `commit-msg` / `pre-commit` hooks. Replacing working enforcement with three dependencies is churn, not an improvement.                                                                                                                                                                  |
| `next-safe-action` / a generic `withAction()` wrapper                | `sakubun/lib/action-result.ts` already documents why a single wrapper is a leaky abstraction for heterogeneous actions. The **contract** (`ActionResult` as a discriminated union) is the 2026 norm and is a strong extraction candidate — but it exists in **one** project, so the rule of three says wait. `reuse-scan` will report it at the second. |
| Turning OWASP ASVS into a gate wholesale                             | ~60–70% of ASVS is automatable in principle, but as a _framework_ it needs per-app scoping; a blanket import produces findings nobody acts on. The CI-hardening subset was taken because it is repo-checkable and universal.                                                                                                                            |
| Pinning `actions/*` and `docker/*` by SHA in the fleet's workflows   | Published guidance targets _third-party_ actions, and pinning first-party namespaces forfeits automatic patches. Available as `"strict": true` per repo, and stated in the gate as a judgement rather than a fact.                                                                                                                                      |

## 5. Open — needs a decision, not more research

- **The SHA-pinning finding is open on all 7 app repos and `commons`.** `.github/workflows/**` is
  governance the agent may not edit; the fix is a human commit. Installing `@thiengthb/test-ci-hardening`
  into a repo lands **red** on that repo's existing drift — which is the point, but it is a migration,
  not a copy.
- **`lib-env` is written but installed nowhere.** Adopting it in an app is a real migration: every
  `process.env.X` read becomes `env.X`, and the app's Dockerfile needs the build-stage
  `SKIP_ENV_VALIDATION=1`. `todo` is the natural first, being the reference repo.

## 6. Verdict log — append one row here, every time the outside was checked

This is the running record that `/code-reuse` Step 1c writes to, and the reason the same question is never researched
twice. **A refusal is a result** — most rows will be refusals, and they are the ones that save the most time later.

Keep a row to one line. If the reasoning needs a paragraph, it is a `decisions.md` entry and this row links to it.

| Date       | Looked for                                     | Where it was checked                                         | Verdict                                                                                                          |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 2026-07-30 | reusable UI components / patterns from the web | 8 shadcn community namespaces (`shadcn search`), zero-config | **§2 above** — 1 of 8 fits, per-item only; components referenced never vendored                                  |
| 2026-07-30 | env validation                                 | `@t3-oss/env-nextjs`, `next-zodenv`, create-t3-app docs      | **ADOPTED as a pattern, refused as a dependency** → `lib-env` on plain zod                                       |
| 2026-07-30 | CI/workflow hardening rules                    | GitHub changelog, StepSecurity, OWASP ASVS                   | **ADOPTED, subset** → `test-ci-hardening`; ASVS as a whole refused (needs per-app scoping)                       |
| 2026-07-30 | container hardening                            | Docker hardening checklists ×2                               | **ADOPTED** → `cap_drop`/`no-new-privileges` active, `read_only` opt-in after measuring                          |
| 2026-07-30 | editor/formatting config                       | EditorConfig spec + Prettier interaction                     | **ADOPTED** → `config-editorconfig`, values pinned to `config-prettier`                                          |
| 2026-07-30 | typed server-action wrapper                    | `next-safe-action`, discriminated-union guides               | **REFUSED for now** — the contract is the 2026 norm but exists in 1 project; rule of three says wait for the 2nd |
| 2026-07-30 | commit/lint tooling                            | `commitlint` + `husky` + `lint-staged`                       | **REFUSED** — the platform's own git hooks already enforce this; 3 deps to replace working enforcement           |

## Sources

- [Pinning GitHub Actions for Enhanced Security](https://www.stepsecurity.io/blog/pinning-github-actions-for-enhanced-security-a-complete-guide) — StepSecurity; SHA pinning, and the `tj-actions/changed-files` tag-repointing compromise (CVE-2025-30066).
- [GitHub Actions policy now supports blocking and SHA pinning actions](https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/) — GitHub Changelog; first-party confirmation that SHA pinning is the intended control.
- [GitHub Actions Security Checklist](https://corgea.com/learn/github-actions-security-checklist) — least-privilege `permissions`, `pull_request_target`, script injection via untrusted context.
- [T3 Env — Next.js](https://env.t3.gg/docs/nextjs) and [Create T3 App: Environment Variables](https://create.t3.gg/en/usage/env-variables) — build-time validation, server/client separation, the `runtimeEnv` literal requirement, `SKIP_ENV_VALIDATION`.
- [Dockerfile Hardening Checklist for Production](https://beefed.ai/en/dockerfile-image-hardening-checklist) and [Docker Security: Hardening Containers for Production](https://zeriflow.com/blog/docker-container-security-guide) — non-root user, drop ALL capabilities, read-only root filesystem, `no-new-privileges`, `npm ci` for deterministic installs.
- [EditorConfig](https://editorconfig.org) and [Linting and Formatting TypeScript](https://finnnannestad.com/blog/linting-and-formatting) — the recommended root file, and its interaction with Prettier.
- [shadcn/ui — Namespaced registries](https://ui.shadcn.com/docs/registry/namespace) and [Registry Directory](https://ui.shadcn.com/docs/directory) — multiple registries per project; community registries built into the CLI with no configuration.
- [next-safe-action](https://next-safe-action.dev/docs/quick-start) — the discriminated-union action result as the current norm.
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) — the standard the CI subset was drawn from.
