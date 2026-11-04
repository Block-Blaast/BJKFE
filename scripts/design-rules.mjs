// 디자인 시스템 금지 패턴. scripts/lint-design.mjs(커밋·CI)와 .claude/hooks/guard-edit.mjs(편집 시점)가 함께 쓴다.
// 규칙의 근거는 .claude/rules/design-system.md.

// 간격은 Figma spacing/N 과 1:1 인 단계만 허용한다. (0 은 "간격 없음"이라 허용)
export const ALLOWED_SPACING = new Set(['0', '1', '2', '3', '4', '5', '6', '8', '12']);

const SPACING_RE =
  /(?<![\w-])-?(?:p|m)[xytblrse]?-([\w.]+)\b|(?<![\w-])gap(?:-[xy])?-([\w.]+)\b|(?<![\w-])-?space-[xy]-([\w.]+)\b/g;

export const RULES = [
  {
    id: 'hex',
    message: 'hex 색상 하드코딩 금지 — 시맨틱 토큰 클래스(bg-bg-*, text-text-*)를 쓰세요',
    find: (line) => [...line.matchAll(/(?<![&\w])#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]),
  },
  {
    id: 'radius',
    message: '모서리는 rounded-md(입력창)·rounded-xl(카드)·rounded-full(알약·원형)만 씁니다',
    // 허용 크기(md, xl, full)는 아래 목록에 없어서 매치되지 않는다.
    // 걸리는 것은 크기 없는 `rounded`/`rounded-t` 와 그 밖의 크기(sm, lg, 2xl, none …)뿐이다.
    find: (line) =>
      [
        ...line.matchAll(
          /(?<![\w-])rounded(?:-(?:[trblse]|tl|tr|bl|br|ss|se|es|ee))?(?:-(?:none|xs|sm|lg|2xl|3xl|4xl))?(?![\w-])/g,
        ),
      ].map((m) => m[0]),
  },
  {
    id: 'arbitrary',
    message: '임의값 클래스 금지 (px/rem/hex) — 토큰이나 허용된 스케일을 쓰세요',
    // Tailwind 임의값은 접두사 바로 뒤에 붙고 공백이 없다. 배열 리터럴 오탐을 막기 위해 그 형태만 잡는다.
    find: (line) =>
      [...line.matchAll(/(?<=[\w-])\[[^\]\s'"`]*(?:px|rem|#)[^\]\s'"`]*\]/g)].map((m) => m[0]),
  },
  {
    id: 'spacing',
    message: `간격은 ${[...ALLOWED_SPACING].join('/')} 단계만 씁니다 (4/8/12/16/20/24/32/48px)`,
    find: (line) =>
      [...line.matchAll(SPACING_RE)]
        .filter((m) => {
          const step = m[1] ?? m[2] ?? m[3];
          // 숫자 단계(p-7, py-1.5)와 1px 값(m-px)만 간격 스케일이다.
          // m-auto, space-x-reverse, pb-safe(@utility) 처럼 이름이 붙은 값은 검사하지 않는다.
          if (!/^(?:\d+(?:\.\d+)?|px)$/.test(step)) return false;
          return !ALLOWED_SPACING.has(step);
        })
        .map((m) => m[0]),
  },
];

// 토큰을 정의하는 파일만 hex 를 가질 수 있다.
export const TOKEN_DEFINITION_FILES = new Set(['packages/ui/src/tokens.css']);

// 검사 대상: 앱과 UI 패키지의 소스
export const isDesignChecked = (rel) =>
  /^(?:apps\/[^/]+|packages\/ui)\/src\/.+\.(?:tsx|ts|jsx|js|css)$/.test(rel) &&
  !TOKEN_DEFINITION_FILES.has(rel);

// 한 파일 내용에서 위반을 모은다. 주석 줄의 예시(`p-[13px]` 같은 설명)는 검사하지 않는다.
export const findViolations = (text) => {
  const found = [];
  text.split('\n').forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    for (const rule of RULES) {
      for (const match of rule.find(line)) {
        found.push({ line: i + 1, rule: rule.id, match, message: rule.message });
      }
    }
  });
  return found;
};
