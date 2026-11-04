// PreToolUse(Edit|MultiEdit|Write): 절대 어기면 안 되는 파일 규칙을 막는다.
// 편집을 적용한 "결과 파일"을 만들어 검사하므로, 기존에 있던 내용은 문제 삼지 않는다.
// exit 2 = 차단, stderr가 Claude에게 사유로 전달된다. 스크립트 오류는 exit 1로 끝나 차단하지 않는다(fail-open).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name: tool, tool_input: args = {} } = input;
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
const filePath = path.resolve(projectDir, args.file_path ?? '');
const rel = path.relative(projectDir, filePath).split(path.sep).join('/');

function block(reason) {
  process.stderr.write(reason);
  process.exit(2);
}

if (rel === 'pnpm-lock.yaml') {
  block(
    'pnpm-lock.yaml은 직접 수정할 수 없습니다. `pnpm add`/`pnpm remove`/`pnpm install`로 갱신하세요.',
  );
}
if (/^apps\/[^/]+\/next-env\.d\.ts$/.test(rel)) {
  block('next-env.d.ts는 Next.js가 자동 생성하는 파일입니다. 직접 수정하지 마세요.');
}

const before = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';

function applyEdit(text, { old_string: oldStr, new_string: newStr, replace_all: all }) {
  if (oldStr === undefined || !text.includes(oldStr)) return null;
  return all ? text.split(oldStr).join(newStr) : text.replace(oldStr, () => newStr);
}

let after = null;
if (tool === 'Write') after = args.content ?? '';
if (tool === 'Edit') after = applyEdit(before, args);
if (tool === 'MultiEdit') {
  after = before;
  for (const edit of args.edits ?? []) {
    after = after === null ? null : applyEdit(after, edit);
  }
}
// 적용할 수 없는 편집은 도구가 스스로 실패하므로 여기서는 통과시킨다.
if (after === null) process.exit(0);

// 디자인 시스템 금지 패턴(scripts/design-rules.mjs)을 `pnpm lint` 와 같은 기준으로 검사한다.
// 편집으로 "새로 생긴" 위반만 막는다.
const { findViolations, isDesignChecked } = await import(
  pathToFileURL(path.join(projectDir, 'scripts/design-rules.mjs')).href
);
if (isDesignChecked(rel)) {
  const key = (v) => `${v.rule}:${v.match}`;
  const tally = (text) => {
    const counts = new Map();
    for (const v of findViolations(text)) counts.set(key(v), (counts.get(key(v)) ?? 0) + 1);
    return counts;
  };
  const prev = tally(before);
  const byKey = new Map(findViolations(after).map((v) => [key(v), v]));
  const added = [...tally(after)]
    .filter(([k, n]) => n > (prev.get(k) ?? 0))
    .map(([k]) => byKey.get(k));
  if (added.length) {
    block(
      '디자인 시스템 규칙 위반:\n' +
        added.map((v) => `- ${v.match} — ${v.message}`).join('\n') +
        '\n시맨틱 토큰(bg-bg-*, text-text-*, border-border-*), rounded-md, 간격 1/2/3/4/5/6/8/12 단계만 씁니다. ' +
        '자세한 규칙은 .claude/rules/design-system.md, 토큰은 packages/ui/src/tokens.css 를 보세요.',
    );
  }
}
