#!/usr/bin/env node
/**
 * Reports where each consumer repo stands against the registry.
 *
 * Copy-in has one real weakness — a fix here does not propagate, and nothing notices when a consumer's
 * copy drifts. It has already happened: sakubun independently grew a second `empty-state` without
 * noticing the registry shipped one (2026-07-19), and four apps carried four different theme toggles.
 * This turns that silence into a list.
 *
 * Six verdicts, because "differs" on its own is not actionable — the first real run produced 72
 * undifferentiated FORKED rows, which is the same as reporting nothing:
 *   CLEAN      — byte-identical to the current registry source
 *   STALE      — identical to an OLDER commit of that source (git history is what separates this from a
 *                fork): the consumer is behind, so `shadcn add` it again
 *   PROSE      — same code, drifted comments. Low priority, but it means a re-add will show a diff
 *   FORKED     — matches no version this registry ever published: someone edited the copy
 *   DELIBERATE — a FORKED file with a written reason in docs/divergences.json
 *   ADAPTED    — a `starter` scaffold the app now owns and edits. The intended outcome, not drift
 *
 * Report-only, always. It never writes to a consumer repo — deciding what to do with a fork is a
 * judgement call (sometimes the fork is right and the canonical should absorb it, as empty-state did).
 *
 * Usage:
 *   node scripts/audit-consumers.mjs              # every sibling repo
 *   node scripts/audit-consumers.mjs todo journal # only these
 *   node scripts/audit-consumers.mjs --forked     # exit 1 if anything is FORKED (for a nudge in CI)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FLEET = resolve(ROOT, '..');
const BUILT = join(ROOT, 'public', 'r');

const args = process.argv.slice(2);
const failOnForked = args.includes('--forked');
const only = args.filter((a) => !a.startsWith('--'));

// A SCAFFOLD item is a starting point the consumer then owns and edits — an app's real Dockerfile or
// 00-map.md diverging from the starter template is the intended outcome, not drift. Comparing them
// buried the handful of real findings under 70 lines of noise on the first run, so they are counted
// separately and never called FORKED.
const SCAFFOLD_CATEGORIES = new Set(['starter']);

// Written-down, reasoned divergences. A reason shorter than this floor does not count — the point is
// that someone decided in a sentence, the same discipline as the rulebook-allow directives.
const MIN_REASON = 20;

function declaredDivergences() {
  const path = join(ROOT, 'docs', 'divergences.json');
  if (!existsSync(path)) return new Map();
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  return new Map(
    Object.entries(parsed.divergences ?? {}).filter(
      ([, reason]) => typeof reason === 'string' && reason.trim().length >= MIN_REASON,
    ),
  );
}

/** Every item the registry publishes, flattened to { item, sourcePath, target, content, scaffold }. */
function registryFiles() {
  const out = [];
  for (const entry of readdirSync(BUILT)) {
    if (!entry.endsWith('.json') || entry === 'registry.json') continue;
    const item = JSON.parse(readFileSync(join(BUILT, entry), 'utf8'));
    const scaffold = (item.categories ?? []).some((c) => SCAFFOLD_CATEGORIES.has(c));
    for (const file of item.files ?? []) {
      if (!file.target || file.content === undefined) continue;
      out.push({
        item: item.name,
        sourcePath: file.path,
        target: file.target.replace(/^~\//, ''),
        content: file.content,
        scaffold,
      });
    }
  }
  return out.sort((a, b) => a.item.localeCompare(b.item));
}

/**
 * Repos that could consume the registry: a `package.json`, and not this repo.
 *
 * Descends TWO container levels, not one. Measured 2026-07-30, the day the app repos moved into
 * `projects/`: with one level this found 87 of 97 installed files and silently dropped
 * `projects/yakudoku/web` entirely — a monorepo whose root carries no `package.json`, so it needs
 * `projects/` + `yakudoku/` + `web/`. It reported a smaller true-looking number rather than failing, which
 * is the worse shape. Depth, not a hardcoded `projects/`, so the next reorganisation costs nothing.
 */
function consumers() {
  const found = [];
  const walk = (rel, depth) => {
    const abs = join(FLEET, rel);
    if (!existsSync(abs) || !statSync(abs).isDirectory()) return;
    if (existsSync(join(abs, 'package.json')) && rel !== 'commons') {
      found.push(rel);
      return; // do not descend into a repo we already matched
    }
    if (depth === 0) return;
    for (const entry of readdirSync(abs)) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;
      walk(join(rel, entry), depth - 1);
    }
  };
  for (const entry of readdirSync(FLEET)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    walk(entry, 2);
  }
  return only.length > 0
    ? found.filter((f) => only.some((o) => f === o || f.endsWith(`/${o}`)))
    : found;
}

/**
 * Say out loud how many repos were searched, and cross-check it a second, independent way.
 *
 * This exists because of what happened on 2026-07-30: the repos moved under `projects/`, this script found
 * 87 of 97 installed files instead of erroring, and the report read as authoritative. A tool that silently
 * narrows its own input is the dangerous shape — so the input is now printed with every run, and compared
 * against a plain `git ls-files`-independent count of `package.json` files. Deliberately NOT a stored
 * baseline (which goes stale the day a project is added); two methods that must agree cannot both be
 * quietly wrong.
 */
function selfCheck(seen) {
  const direct = new Set();
  const scan = (rel, depth) => {
    const abs = join(FLEET, rel);
    if (!existsSync(abs) || !statSync(abs).isDirectory()) return;
    if (existsSync(join(abs, 'package.json'))) {
      if (rel !== 'commons') direct.add(rel);
      return;
    }
    if (depth === 0) return;
    for (const entry of readdirSync(abs)) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;
      scan(`${rel}/${entry}`, depth - 1);
    }
  };
  for (const entry of readdirSync(FLEET)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    scan(entry, 2);
  }
  const missing = [...direct].filter((d) => !seen.includes(d));
  return { direct: direct.size, missing };
}

/** Every historical version of a registry source file, newest first (excluding the current one). */
function history(sourcePath) {
  try {
    const shas = execFileSync('git', ['log', '--format=%H', '--', sourcePath], {
      cwd: ROOT,
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);
    return shas
      .map((sha) => {
        try {
          return execFileSync('git', ['show', `${sha}:${sourcePath}`], {
            cwd: ROOT,
            encoding: 'utf8',
          });
        } catch {
          return null; // the file did not exist at that commit
        }
      })
      .filter((text) => text !== null);
  } catch {
    return [];
  }
}

// Line endings are not drift: a consumer checked out on Windows legitimately holds CRLF.
const normalize = (text) => text.replace(/\r\n/g, '\n');

/**
 * Strip comments and collapse whitespace, so a copy that differs ONLY in its prose is not reported with
 * the same weight as one whose logic diverged. On the first real run this was the difference between 72
 * undifferentiated FORKED rows and a handful that actually need a decision: `todo`'s `truncate` had a
 * reworded docblock, while `journal`'s `field` imported InfoHint where the registry now uses InfoTooltip.
 * Crude on purpose — a `//` inside a string literal would fool it, which costs a false "code differs",
 * never a missed one.
 */
const codeOnly = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

const files = registryFiles();
const rows = [];
const counts = { CLEAN: 0, STALE: 0, FORKED: 0, DELIBERATE: 0, PROSE: 0, ADAPTED: 0 };
const declared = declaredDivergences();

/** `projects/sakubun` + `lib/db.ts` matches a key written as `sakubun::lib/db.ts`. */
function lookupDivergence(repo, target) {
  const exact = declared.get(`${repo}::${target}`);
  if (exact) return exact;
  for (const [key, reason] of declared) {
    const [keyRepo, keyPath] = key.split('::');
    if (keyPath === target && (repo === keyRepo || repo.endsWith(`/${keyRepo}`))) return reason;
  }
  return undefined;
}
const historyCache = new Map();

const searched = consumers();
for (const repo of searched) {
  for (const file of files) {
    const abs = join(FLEET, repo, file.target);
    if (!existsSync(abs)) continue; // not installed here — nothing to say about it
    const actual = normalize(readFileSync(abs, 'utf8'));
    let verdict = 'FORKED';
    let detail = '';
    if (actual === normalize(file.content)) {
      verdict = 'CLEAN';
    } else {
      if (!historyCache.has(file.sourcePath)) {
        historyCache.set(file.sourcePath, history(file.sourcePath).map(normalize));
      }
      const older = historyCache.get(file.sourcePath);
      const behind = older.findIndex((text) => text === actual);
      const a = actual.split('\n').length;
      const b = normalize(file.content).split('\n').length;
      if (behind >= 0) {
        verdict = 'STALE';
        detail = `${behind + 1} version(s) behind`;
      } else if (file.scaffold) {
        // Owned and edited by the app, exactly as intended — report it, do not call it drift.
        verdict = 'ADAPTED';
        detail = `${a} lines vs ${b} in the template`;
      } else if (codeOnly(actual) === codeOnly(normalize(file.content))) {
        verdict = 'PROSE';
        detail = 'same code, comments differ';
      } else {
        // Keys are written with the bare project name (`sakubun::lib/db.ts`), but `repo` is the path
        // relative to the repo root, which gained a `projects/` prefix on 2026-07-30. An exact lookup sent
        // all four declared divergences straight back to FORKED — the record was still there, the match
        // wasn't. Compare on the tail so a declaration outlives the next reorganisation.
        const reason = lookupDivergence(repo, file.target);
        if (reason) {
          verdict = 'DELIBERATE';
          detail = reason.length > 60 ? `${reason.slice(0, 57)}...` : reason;
        } else {
          detail = `code differs — ${a} lines vs ${b} in the registry`;
        }
      }
    }
    counts[verdict] += 1;
    rows.push({ repo, item: file.item, target: file.target, verdict, detail });
  }
}

const pad = (s, n) => String(s).padEnd(n);
const width = {
  repo: Math.max(4, ...rows.map((r) => r.repo.length)),
  item: Math.max(4, ...rows.map((r) => r.item.length)),
  target: Math.max(6, ...rows.map((r) => r.target.length)),
};

const check = selfCheck(searched);
console.log(
  `searched ${searched.length} repo(s) for ${files.length} registry file(s)` +
    (check.missing.length
      ? `  ** ${check.missing.length} repo(s) with a package.json were NOT searched: ${check.missing.join(', ')} **`
      : ` (cross-checked: ${check.direct} repos hold a package.json)`),
);
console.log(
  `${pad('REPO', width.repo)}  ${pad('ITEM', width.item)}  ${pad('FILE', width.target)}  VERDICT`,
);
// ADAPTED rows are the expected state for a scaffold, so they go last — the top of the output should be
// the part that needs a decision.
const order = { FORKED: 0, STALE: 1, PROSE: 2, CLEAN: 3, DELIBERATE: 4, ADAPTED: 5 };
for (const r of rows.sort(
  (a, b) => order[a.verdict] - order[b.verdict] || a.repo.localeCompare(b.repo),
)) {
  const line = `${pad(r.repo, width.repo)}  ${pad(r.item, width.item)}  ${pad(r.target, width.target)}  ${r.verdict}`;
  console.log(r.detail ? `${line}  (${r.detail})` : line);
}

if (rows.length === 0) {
  console.log('\nNo installed registry files found in any sibling repo.');
} else {
  console.log(
    `\n${rows.length} installed file(s): ${counts.FORKED} FORKED · ${counts.STALE} STALE · ` +
      `${counts.PROSE} PROSE · ${counts.CLEAN} CLEAN · ${counts.DELIBERATE} DELIBERATE · ` +
      `${counts.ADAPTED} ADAPTED (a scaffold the app now owns — expected)`,
  );
  if (counts.STALE > 0) console.log('STALE → re-run `shadcn add` for that item.');
  if (counts.PROSE > 0) {
    console.log('PROSE → identical logic, drifted comments. Low priority; re-add to converge.');
  }
  if (counts.FORKED > 0) {
    console.log(
      'FORKED → decide: fold the change back into the registry, or record why this repo diverges.',
    );
  }
}

if (failOnForked && counts.FORKED > 0) process.exit(1);
