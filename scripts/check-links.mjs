#!/usr/bin/env node
// Checks every local link, asset and #anchor in the site's HTML and CSS. No dependencies.
// Usage: node scripts/check-links.mjs
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', '404.html', 'resume/resume.html'];
const styles = ['assets/css/site.css'];
const problems = [];
let checked = 0;

const isExternal = ref => /^(https?:|mailto:|tel:|data:)/.test(ref);
const mustExist = (from, ref) => {
  checked++;
  const target = join(root, dirname(from), ref.split(/[?#]/)[0]);
  if (!existsSync(target)) problems.push(`${from}: missing file "${ref}"`);
};

for (const page of pages) {
  const html = readFileSync(join(root, page), 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  for (const [, attr, ref] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
    if (!ref) problems.push(`${page}: empty ${attr}`);
    else if (ref.startsWith('#')) { checked++; if (!ids.has(ref.slice(1))) problems.push(`${page}: broken anchor "${ref}"`); }
    else if (ref.startsWith('http://')) problems.push(`${page}: insecure link "${ref}"`);
    else if (!isExternal(ref)) mustExist(page, ref);
  }
  for (const [tag] of html.matchAll(/<a\s[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noopener/.test(tag)) problems.push(`${page}: target="_blank" without rel="noopener": ${tag.slice(0, 80)}`);
  }
}
for (const sheet of styles) {
  const css = readFileSync(join(root, sheet), 'utf8');
  for (const [, ref] of css.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) if (!isExternal(ref)) mustExist(sheet, ref);
}

if (problems.length) {
  console.error(problems.map(p => '  x ' + p).join('\n'));
  console.error(`\n${problems.length} problem(s) in ${checked} references.`);
  process.exit(1);
}
console.log(`ok: ${checked} local references resolve.`);
