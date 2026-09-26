// scripts/copy-api-deps.js
//
// Copies the src/ files that api/*.ts wrappers import into
// api/_lib/ before Vercel's build runs. Vercel's Node runtime
// reliably bundles imports under api/, but not cross-directory
// imports into src/. Copying the dependencies into api/_lib
// makes the module graph resolvable at runtime.

import { mkdirSync, copyFileSync, rmSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

const destRoot = join(root, 'api', '_lib');

// Files and directories under src/ that api wrappers need.
// The list mirrors what the wrappers transitively import.
const sources = [
  'services/verify',
  'utils',
];

function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const src = join(from, entry);
    const dst = join(to, entry);
    if (statSync(src).isDirectory()) {
      copyDir(src, dst);
    } else {
      copyFileSync(src, dst);
    }
  }
}

if (existsSync(destRoot)) {
  rmSync(destRoot, { recursive: true, force: true });
}
mkdirSync(destRoot, { recursive: true });

for (const rel of sources) {
  const absSrc = join(root, 'src', rel);
  if (!existsSync(absSrc)) {
    console.warn(`[copy-api-deps] skip (missing): src/${rel}`);
    continue;
  }
  const absDst = join(destRoot, rel);
  const stat = statSync(absSrc);
  if (stat.isDirectory()) {
    copyDir(absSrc, absDst);
  } else {
    mkdirSync(dirname(absDst), { recursive: true });
    copyFileSync(absSrc, absDst);
  }
}

console.log('[copy-api-deps] copied src/ dependencies into api/_lib/');
