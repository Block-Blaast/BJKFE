# BJKFE 에이전트 가이드

**발주콕** 프론트엔드 모노레포입니다. 발주콕은 작업자가 채팅 한 줄로 기록하면 창고 숫자와 바깥 상황을 근거로 발주를 검토해, 사장님이 원클릭으로 결정하게 하는 영세 제조 현장용 웹 서비스입니다. 이 파일은 모든 AI 도구가 읽는 공용 입구이며, 상세 규칙은 `.claude/rules/`에 있습니다.

## 구성

| 경로              | 패키지        | 설명                                                                                     |
| ----------------- | ------------- | ---------------------------------------------------------------------------------------- |
| `apps/web`        | `@bjk/web`    | 발주콕 웹(Next.js PWA). 폰은 앱 화면(`/m/*`), PC는 웹 화면 (포트 3000)                   |
| `packages/api`    | `@bjk/api`    | API 계층: fetch 클라이언트, 쿼리 키, 도메인 상수(판정·체크·상태·권한)                    |
| `packages/ui`     | `@bjk/ui`     | 디자인 토큰(`tokens.css`), Pretendard 폰트, Figma 컴포넌트(Button·StatusChip·Input·Card) |
| `packages/config` | `@bjk/config` | 공용 tsconfig, ESLint 설정                                                               |

- 명세서상 "앱과 웹은 같은 웹 서비스의 두 화면"입니다. 사장님·관리자는 폰과 PC를 모두 쓰므로 **앱을 나누지 않고 경로로 나눕니다.** (`.claude/rules/structure.md`)
- 내부 패키지는 빌드 없이 TS 소스를 내보내고, `apps/web/next.config.ts`의 `transpilePackages`로 컴파일합니다. 새 내부 패키지를 쓰면 여기에 추가하세요.
- 명세서의 기능 ID(F-REVIEW-04, F-CHAT-02 …)와 화면 ID(M-01~05, W-01~10)로 작업을 부릅니다. 코드 주석에도 해당 ID를 남깁니다.

## 스택

- pnpm workspace + Turborepo
- Next.js 16 (App Router, Cache Components, `proxy.ts`), React 19.3, TypeScript 5, Turbopack
- Tailwind CSS v4 (설정 파일 없음 — 토큰은 `packages/ui/src/tokens.css` 한 곳, Figma `sJfs73BOfgYtBrAB3Xx8si`가 기준)
- 폰트: Pretendard Variable(`@bjk/ui/fonts`, next/font/local 셀프 호스팅) → Noto Sans KR → system-ui
- TanStack Query v5 (서버 상태) + Zustand v5 (클라이언트 상태)
- 백엔드는 별도 레포(FastAPI + PostgreSQL). 실시간은 SSE, 알림은 Web Push(VAPID)
- **Next.js API는 메이저 버전마다 크게 바뀝니다.** 기억에 의존하지 말고 `node_modules/next/dist/docs/`나 https://nextjs.org/docs 를 먼저 확인하세요.
- 백엔드 API 명세(OpenAPI)는 아직 없습니다. 응답 형식·인증 방식을 추측해서 코드를 쓰지 마세요. 명세서에 적힌 값(예: F-REVIEW-07 출력 예시)은 써도 됩니다.

## 명령어 (루트에서 실행)

- 개발: `pnpm dev` — 목업은 없습니다. 모든 데이터는 백엔드(BJK-AI-BE) DB에서 옵니다. `apps/web/.env.local`의 `API_PROXY_TARGET`에 백엔드 주소(배포 서버 또는 로컬 백엔드)를 넣으면 개발 서버가 `/api/*`를 그쪽으로 넘깁니다.
- 검증: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm format:check`
- `pnpm lint`에는 `pnpm lint:design`(디자인 금지 패턴 검사 + `tokens.css`와 Figma 표 대조)이 포함됩니다.
- 특정 패키지만: `pnpm --filter @bjk/web <script>`
- 새 패키지 설치: `pnpm --filter @bjk/<패키지> add <패키지>` — **설치할 패키지를 반드시 지정합니다.** 루트에는 개발 도구만 둡니다(`pnpm add -w -D`).
- 내부 패키지 의존성: `pnpm --filter @bjk/web add '@bjk/api@workspace:*'` (zsh에서는 따옴표 필수)
- pre-commit: husky + lint-staged. 파일마다 가장 가까운 `package.json`의 lint-staged 설정으로 그 패키지 안에서 실행됩니다.

## 절대 어기면 안 되는 규칙

Claude Code에서는 `.claude/hooks/`가 자동으로 차단하지만, 다른 도구는 직접 지켜야 합니다.

- 패키지 매니저는 **pnpm만** 사용합니다. npm(설치·실행 계열), yarn, bun, npx를 쓰지 마세요. (일회성 실행은 `pnpm dlx`)
- `pnpm-lock.yaml`, `apps/*/next-env.d.ts`는 직접 수정하지 않습니다.
- 디자인 시스템 규칙: 시맨틱 토큰만, hex·임의값 클래스 금지, 모서리는 `rounded-md`·`rounded-xl`·`rounded-full`만, 간격은 1/2/3/4/5/6/8/12 단계만. (`.claude/rules/design-system.md`)
- `packages/ui/src/tokens.css`의 값은 Figma와 대조된 값입니다. 임의로 바꾸지 말고, 바꿀 때는 `scripts/verify-tokens.mjs`의 기대값도 함께 바꿉니다.
- `.env`, `.env.local`의 값을 읽거나 커밋하지 않습니다. 새 환경변수는 `apps/web/.env.example`에 키만 추가합니다.
- 판정·체크 코드·상태 문자열을 화면에 직접 쓰지 않습니다. `@bjk/api/domain/*` 상수를 씁니다.

## 상세 규칙 — 작업 전에 해당 파일을 읽으세요

| 작업 대상                                             | 규칙 파일                        |
| ----------------------------------------------------- | -------------------------------- |
| 모든 작업 (경로 구성, 폰/PC 라우팅)                   | `.claude/rules/structure.md`     |
| 앱·패키지 코드 (컴포넌트 선언, 서버/클라이언트, 주석) | `.claude/rules/code-style.md`    |
| 서버 연동 (`packages/api`, `hooks`, 화면)             | `.claude/rules/api.md`           |
| 앱 화면 — 폰 (`apps/web/src/app/m/**`)                | `.claude/rules/mobile.md`        |
| 웹 화면 — PC (`apps/web/src/app/(desk)/**`)           | `.claude/rules/desk.md`          |
| 스타일·디자인 토큰·공용 컴포넌트 (`packages/ui` 포함) | `.claude/rules/design-system.md` |

## 브랜치 · 커밋

- `main` 하나로 개발합니다. 기능 브랜치 `feat/BJK-<번호>`에서 PR을 올려 `main`에 머지합니다.
- 커밋 메시지: `<type>:: <한글 설명>` (예: `feat::`, `fix::`, `docs::`, `design::`, `refactor::`, `chore::`)
- 화면 하나를 다룬 커밋이면 화면 ID를 붙여도 됩니다. (예: `feat:: [M-02] 채팅 확인 카드`)
