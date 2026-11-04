// 디자인 시스템 금지 패턴 검사. `pnpm lint` 에 포함된다.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findViolations, isDesignChecked } from './design-rules.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.next', '.turbo', 'dist', 'build']);

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    if (SKIP_DIRS.has(name)) return [];
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const files = ['apps', 'packages']
  .flatMap((d) => walk(path.join(root, d)))
  .map((f) => path.relative(root, f).split(path.sep).join('/'))
  .filter(isDesignChecked);

let total = 0;
for (const rel of files) {
  for (const v of findViolations(readFileSync(path.join(root, rel), 'utf8'))) {
    total++;
    console.error(`${rel}:${v.line}  [${v.rule}] ${v.match}  — ${v.message}`);
  }
}

if (total > 0) {
  console.error(`\n✖ 디자인 규칙 위반 ${total}건 (${files.length}개 파일 검사)`);
  process.exit(1);
}
console.log(`✔ 디자인 규칙 위반 0건 (${files.length}개 파일 검사)`);
