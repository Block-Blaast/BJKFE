# BJKFE 에이전트 가이드

BJK 웹 프론트엔드 모노레포입니다. 이 파일은 모든 AI 도구가 읽는 공용 입구이며, 상세 규칙은 `.claude/rules/`에 있습니다.

## 구성

| 경로              | 패키지        | 설명                                                                 |
| ----------------- | ------------- | -------------------------------------------------------------------- |
| `apps/user`       | `@bjk/user`   | 사용자용 웹. **모바일 우선** (포트 3000)                             |
| `apps/admin`      | `@bjk/admin`  | 운영자용 어드민. **데스크톱 전용** (포트 3001)                       |
| `packages/api`    | `@bjk/api`    | 두 앱이 공유하는 API 계층: fetch 클라이언트, 요청·응답 타입, 쿼리 키 |
| `packages/config` | `@bjk/config` | 공용 tsconfig, ESLint 설정                                           |

- UI 컴포넌트는 **앱끼리 공유하지 않습니다.** 사용자 앱과 어드민은 디자인이 다릅니다. 정말 같은 컴포넌트가 두 앱에 필요해지면 그때 `packages/ui`를 만듭니다.
- 내부 패키지는 빌드 없이 TS 소스를 내보내고, 각 앱의 `next.config.ts`의 `transpilePackages`로 컴파일합니다. 새 내부 패키지를 앱에서 쓰면 여기에 추가하세요.

## 스택

- pnpm workspace + Turborepo
- Next.js 16 (App Router), React 19.3, TypeScript 5, Turbopack
- Tailwind CSS v4 (설정 파일 없음 — 토큰은 각 앱의 `src/app/globals.css`의 `@theme`)
- TanStack Query v5 (서버 상태) + Zustand v5 (클라이언트 상태)
- **Next.js API는 메이저 버전마다 크게 바뀝니다.** (예: `params`/`searchParams`가 Promise, `middleware` → `proxy`, Cache Components) 기억에 의존하지 말고 https://nextjs.org/docs 를 먼저 확인하세요.
- 백엔드 API 명세는 아직 정해지지 않았습니다. 응답 형식·인증 방식을 추측해서 코드를 쓰지 마세요.

## 명령어 (루트에서 실행)

- 개발: `pnpm dev` (전체) / `pnpm dev:user` / `pnpm dev:admin`
- 검증: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm format:check`
- 특정 패키지만: `pnpm --filter @bjk/user <script>`
- 새 패키지 설치: `pnpm --filter @bjk/<앱> add <패키지>` — **설치할 앱을 반드시 지정합니다.** 루트에는 개발 도구만 둡니다(`pnpm add -w -D`).
- 내부 패키지 의존성: `pnpm --filter @bjk/<앱> add '@bjk/api@workspace:*'` (zsh에서는 따옴표 필수)
- pre-commit: husky + lint-staged. 파일마다 가장 가까운 `package.json`의 lint-staged 설정으로 그 패키지 안에서 실행됩니다.

## 절대 어기면 안 되는 규칙

Claude Code에서는 `.claude/hooks/`가 자동으로 차단하지만, 다른 도구는 직접 지켜야 합니다.

- 패키지 매니저는 **pnpm만** 사용합니다. npm(설치·실행 계열), yarn, bun, npx를 쓰지 마세요. (일회성 실행은 `pnpm dlx`)
- `pnpm-lock.yaml`, `apps/*/next-env.d.ts`는 직접 수정하지 않습니다.
- 간격·색·반경·폰트 크기에 Tailwind 임의값(`p-[13px]`, `text-[#FF8800]`)을 쓰지 말고 기본 스케일이나 `@theme` 토큰을 씁니다. 요소 크기(`w-[60px]`)는 허용됩니다.
- `.env`, `.env.local`의 값을 읽거나 커밋하지 않습니다. 새 환경변수는 해당 앱의 `.env.example`에 키만 추가합니다.
- `apps/user`와 `apps/admin`은 서로 import 하지 않습니다. 공유가 필요하면 `packages/`로 옮깁니다.

## 상세 규칙 — 작업 전에 해당 파일을 읽으세요

| 작업 대상                                             | 규칙 파일                        |
| ----------------------------------------------------- | -------------------------------- |
| 모든 작업                                             | `.claude/rules/structure.md`     |
| 앱·패키지 코드 (컴포넌트 선언, 서버/클라이언트, 주석) | `.claude/rules/code-style.md`    |
| 서버 연동 (`packages/api`, 앱의 `hooks`, 화면)        | `.claude/rules/api.md`           |
| 사용자 앱 UI (`apps/user`)                            | `.claude/rules/user.md`          |
| 어드민 UI (`apps/admin`)                              | `.claude/rules/admin.md`         |
| 스타일 공통 (Tailwind, 토큰)                          | `.claude/rules/design-system.md` |

## 브랜치 · 커밋

- `main` 하나로 개발합니다. 기능 브랜치 `feat/BJK-<번호>`에서 PR을 올려 `main`에 머지합니다.
- 커밋 메시지: `<type>:: <한글 설명>` (예: `feat::`, `fix::`, `docs::`, `design::`, `refactor::`, `chore::`)
- 한 앱만 바꾼 커밋이면 설명 앞에 범위를 붙여도 됩니다. (예: `feat:: [admin] 회원 목록 화면`)
