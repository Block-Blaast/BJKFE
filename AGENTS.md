# BJKFE 에이전트 가이드

BJK 웹 프론트엔드입니다. 이 파일은 모든 AI 도구가 읽는 공용 입구이며, 상세 규칙은 `.claude/rules/`에 있습니다.

## 스택

- Next.js 16 (App Router, `src/app/`), React 19.3, TypeScript 5, Turbopack
- Tailwind CSS v4 (설정 파일 없음 — 토큰은 `src/app/globals.css`의 `@theme`)
- TanStack Query v5 (서버 상태) + Zustand v5 (클라이언트 상태), HTTP는 `fetch` 래퍼(`src/api/client.ts`)
- **Next.js API는 메이저 버전마다 크게 바뀝니다.** (예: `params`/`searchParams`가 Promise, `middleware` → `proxy`, Cache Components) 기억에 의존하지 말고 https://nextjs.org/docs 를 먼저 확인하세요.
- 백엔드 API 명세는 아직 정해지지 않았습니다. 응답 형식·인증 방식을 추측해서 코드를 쓰지 마세요.

## 명령어

- 새 패키지: `pnpm add <패키지>` / 개발 의존성: `pnpm add -D <패키지>`
- 실행: `pnpm dev` / 빌드: `pnpm build`
- 검증: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`
- pre-commit: husky + lint-staged (eslint --fix, prettier)

## 절대 어기면 안 되는 규칙

Claude Code에서는 `.claude/hooks/`가 자동으로 차단하지만, 다른 도구는 직접 지켜야 합니다.

- 패키지 매니저는 **pnpm만** 사용합니다. npm(설치·실행 계열), yarn, bun, npx를 쓰지 마세요. (일회성 실행은 `pnpm dlx`)
- `pnpm-lock.yaml`, `next-env.d.ts`는 직접 수정하지 않습니다.
- 간격·색·반경·폰트 크기에 Tailwind 임의값(`p-[13px]`, `text-[#FF8800]`)을 쓰지 말고 기본 스케일이나 `@theme` 토큰을 씁니다. 요소 크기(`w-[60px]`)는 허용됩니다.
- `.env`, `.env.local`의 값을 읽거나 커밋하지 않습니다. 새 환경변수는 `.env.example`에 키만 추가합니다.

## 상세 규칙 — 작업 전에 해당 파일을 읽으세요

| 작업 대상                                              | 규칙 파일                        |
| ------------------------------------------------------ | -------------------------------- |
| 모든 작업                                              | `.claude/rules/structure.md`     |
| `src/**` 코드 (컴포넌트 선언, 서버/클라이언트, 주석)   | `.claude/rules/code-style.md`    |
| 서버 연동 (`src/api`, `src/hooks`, `src/types`, 화면)  | `.claude/rules/api.md`           |
| UI·스타일 (`src/app`, `src/components`, `globals.css`) | `.claude/rules/design-system.md` |

## 브랜치 · 커밋

- `main` 하나로 개발합니다. 기능 브랜치 `feat/BJK-<번호>`에서 PR을 올려 `main`에 머지합니다.
- 커밋 메시지: `<type>:: <한글 설명>` (예: `feat::`, `fix::`, `docs::`, `design::`, `refactor::`, `chore::`)
