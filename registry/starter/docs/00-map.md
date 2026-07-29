# &lt;app&gt; — Map

> Read this first. It is the cheap read that replaces opening the codebase, and it is the one doc that
> must never go stale. Standard: `platform/standards/documentation.md`.
>
> **Scaffolded from `@thiengthb/starter-web-app`. Fill every &lt;placeholder&gt; before the first feature
> lands** — a map that still says &lt;app&gt; is worse than no map, because it is read and believed.

## 1. Essence

&lt;One paragraph: what this app is for, who uses it, and the one thing it must get right.&gt;

`kind`: `web-app` · `target`: &lt;nuc | local | cloud&gt; (the row in `platform/inventory.md §0` is the
source of truth — read it, do not assume).

## 2. Stack

| Layer    | Tech                                                       |
| -------- | ---------------------------------------------------------- |
| Frontend | Next.js App Router, React 19, Tailwind v4, shadcn/ui       |
| Data     | &lt;Prisma + SQLite in the named volume at /data&gt;       |
| Tests    | Vitest (`npm test`) — see `platform/standards/testing.md`  |
| Deploy   | &lt;Dockerfile + docker-compose.yml; CI builds to ghcr&gt; |

## 3. Module map / entry points

```
app/                 routes; app/api/health = liveness (open, never behind auth)
components/          UI; shared/product-agnostic pieces come from commons (`shadcn add @thiengthb/...`)
lib/                 pure logic + the data layer
scripts/             rebuild-and-verify.sh (+ verify.env, which holds this app's routes and port)
docs/                this map · decisions.md · gates.json · plans/
```

## 4. Main flows

1. &lt;The one flow that matters most, end to end.&gt;

## 5. Highlights

- &lt;The non-obvious thing a newcomer would get wrong.&gt;

## 6. Invariants

- **App data lives in the named volume** (`/data`), never in the image, never a bind mount.
- **Secrets only in `.env`** (chmod 600, gitignored) — never in compose, the Dockerfile or code.
- **Never hand-roll auth** — an established library, or the target's identity provider.
- **`/api/health` stays open**, or nothing can check whether the app is alive.
- &lt;This app's own invariants.&gt;

## 7. Secrets / env

| Var         | What it is                       |
| ----------- | -------------------------------- |
| `HOST_PORT` | published port for the local run |
| &lt;...&gt; | &lt;...&gt;                      |

## 8. Working here

```bash
npm run dev                          # localhost:3000
npx vitest run                       # tests (add "test": "vitest run" to package.json for `npm test`)
npx prettier --check .               # formatting (add "format:check" likewise)
bash scripts/rebuild-and-verify.sh   # rebuild the container and prove it serves
```

The two npm scripts above are the one thing `shadcn add` could not do for you: a registry item installs
files, and `package.json` is a file it must not overwrite. Add them once and forget it.

## 9. Further reading

- The _why_ behind decisions: `docs/decisions.md` · active plans: `docs/plans/`
- Platform rules: the repo-root `CLAUDE.md` and `platform/standards/`
