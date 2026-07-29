#!/usr/bin/env node
/**
 * Generates the README item table FROM registry.json, and lints the item metadata.
 *
 * Why this exists: the hand-maintained table had drifted to 10 of 15 items — `app-sidebar`,
 * `breadcrumbs`, `data-table`, `data-pagination` and `info-tooltip` shipped without ever being listed,
 * so the only human-readable index of the registry was silently wrong. A generated table cannot drift.
 *
 * The metadata lint matters more than it looks: `description` is what `shadcn view` and the shadcn MCP
 * server show an agent working in ANOTHER repo. If it is missing, or written in Vietnamese (dev
 * artifacts are English on this platform), the item is effectively undiscoverable there.
 *
 * Usage:
 *   node scripts/gen-readme.mjs           # rewrite the generated block in README.md
 *   node scripts/gen-readme.mjs --check   # exit 1 if the block is stale or the metadata is invalid (CI)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not URL.pathname — this repo is also worked on from the Windows box, where a
// pathname keeps its leading slash ("/D:/...") and every join below would resolve to nothing.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = join(ROOT, 'registry.json');
const README = join(ROOT, 'README.md');
const BEGIN = '<!-- BEGIN GENERATED: items (node scripts/gen-readme.mjs) -->';
const END = '<!-- END GENERATED: items -->';

// Vietnamese-specific letters. Plain ASCII prose passes; a Vietnamese description does not.
const VIETNAMESE = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;

/** Reads the root registry plus any `include`d registry files, returning all items in order. */
function readItems() {
  const root = JSON.parse(readFileSync(REGISTRY, 'utf8'));
  const items = [...(root.items ?? [])];
  for (const rel of root.include ?? []) {
    const included = JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
    items.push(...(included.items ?? []));
  }
  return items;
}

/** Returns a list of human-readable problems with the item metadata (empty list = clean). */
function lint(items) {
  const problems = [];
  const names = new Set(items.map((item) => item.name));
  const seen = new Set();
  for (const item of items) {
    const where = `item "${item.name ?? '(unnamed)'}"`;
    if (!item.name) problems.push(`${where} has no name`);
    if (seen.has(item.name)) problems.push(`${where} is declared twice`);
    seen.add(item.name);
    if (!item.title) problems.push(`${where} has no title`);
    if (!item.description) problems.push(`${where} has no description`);
    if (item.description && VIETNAMESE.test(item.description)) {
      problems.push(`${where} description is Vietnamese — dev artifacts are English (AC-5)`);
    }
    for (const file of item.files ?? []) {
      if (!file.target) problems.push(`${where} file "${file.path}" has no target`);
    }
    // A bare registryDependency resolves against the DEFAULT shadcn registry, so a sibling item
    // referenced without its namespace fails to install (this shipped broken in data-table).
    for (const dep of item.registryDependencies ?? []) {
      if (!dep.startsWith('@') && !dep.startsWith('http') && names.has(dep)) {
        problems.push(`${where} depends on "${dep}" without the @thiengthb/ namespace`);
      }
    }
  }
  return problems;
}

function table(items) {
  const rows = items.map((item) => {
    const targets = (item.files ?? []).map((f) => `\`${f.target}\``).join('<br>');
    const needs = [
      ...(item.registryDependencies ?? []).map((d) => `\`${d}\``),
      ...(item.dependencies ?? []).map((d) => `npm \`${d}\``),
    ].join(', ');
    return `| \`${item.name}\` | ${item.description} | ${targets} | ${needs || '–'} |`;
  });
  return [
    `<!-- ${items.length} items -->`,
    '| Item | What it is | Installs to | Also pulls in |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

const items = readItems();
const problems = lint(items);
if (problems.length > 0) {
  console.error(
    `registry.json metadata is invalid:\n${problems.map((p) => `  - ${p}`).join('\n')}`,
  );
  process.exit(1);
}

const readme = readFileSync(README, 'utf8');
const begin = readme.indexOf(BEGIN);
const end = readme.indexOf(END);
if (begin === -1 || end === -1) {
  console.error(`README.md is missing the generated block markers:\n  ${BEGIN}\n  ${END}`);
  process.exit(1);
}

const next = `${readme.slice(0, begin + BEGIN.length)}\n\n${table(items)}\n\n${readme.slice(end)}`;
const isCheck = process.argv.includes('--check');

// Compare CONTENT, not bytes: Prettier pads markdown table columns after this script writes them, so a
// byte comparison would report "stale" forever and the two tools would overwrite each other every run.
const normalize = (text) =>
  text
    .slice(text.indexOf(BEGIN), text.indexOf(END))
    .split('\n')
    .map((line) =>
      line
        .trim()
        .replace(/\s*\|\s*/g, '|')
        .replace(/-{2,}/g, '-'),
    )
    .filter((line) => line.length > 0)
    .join('\n');

if (normalize(next) === normalize(readme)) {
  console.log(`README item table is up to date (${items.length} items).`);
  process.exit(0);
}
if (isCheck) {
  console.error(
    `README item table is STALE (${items.length} items in registry.json).\n` +
      'Run: node scripts/gen-readme.mjs',
  );
  process.exit(1);
}
writeFileSync(README, next);
console.log(`README item table regenerated (${items.length} items).`);
