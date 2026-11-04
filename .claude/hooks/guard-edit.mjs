// PreToolUse(Edit|MultiEdit|Write): 절대 어기면 안 되는 파일 규칙을 막는다.
// 편집을 적용한 "결과 파일"을 만들어 검사하므로, 기존에 있던 내용은 문제 삼지 않는다.
// exit 2 = 차단, stderr가 Claude에게 사유로 전달된다. 스크립트 오류는 exit 1로 끝나 차단하지 않는다(fail-open).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

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
if (rel === 'next-env.d.ts') {
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

if (/^src\/.+\.[jt]sx$/.test(rel)) {
  const patterns = [
    /(?<![\w-])-?(?:p[xytblrse]?|m[xytblrse]?|gap(?:-[xy])?|space-[xy]|rounded(?:-(?:[tblrse]|tl|tr|bl|br|ss|se|es|ee))?|text|bg|leading|tracking)-\[[^\]\s]+\]/g,
    /(?<![\w-])(?:border(?:-[xytblrse])?|ring|outline|fill|stroke|shadow|divide|placeholder|decoration)-\[(?:#|rgba?\(|hsla?\()[^\]\s]*\]/g,
  ];
  const tally = (text) => {
    const counts = new Map();
    for (const re of patterns) {
      for (const [m] of text.matchAll(re)) counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    return counts;
  };
  const prev = tally(before);
  const added = [...tally(after)]
    .filter(([cls, n]) => n > (prev.get(cls) ?? 0))
    .map(([cls]) => cls);
  if (added.length) {
    block(
      `간격·반경·색·폰트 크기에 임의값을 쓸 수 없습니다: ${added.join(', ')}\n` +
        'Tailwind 기본 스케일(`p-4`, `rounded-md`, `text-sm`)이나 `src/app/globals.css`의 `@theme` 토큰을 쓰고, ' +
        '맞는 토큰이 없으면 `@theme`에 먼저 추가하세요. 요소 크기(`w-[60px]`, `h-[...]`)는 허용됩니다.',
    );
  }
}
