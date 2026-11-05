# 디렉토리 구조

## 모노레포

- `apps/web`: 발주콕 Next 앱 하나. 폰 화면과 PC 화면을 경로로 나눕니다(아래).
- `packages/api`: 두 앱이 함께 쓰는 서버 연동 코드. React 컴포넌트·훅(`useQuery` 호출)은 두지 않습니다.
- `packages/ui`: 디자인 토큰(`src/tokens.css`), 폰트(`src/fonts.ts`), Figma 컴포넌트(`src/components/`). 새 컴포넌트 파일은 `exports`의 `./components/*` 패턴으로 자동 노출됩니다.
- `packages/config`: tsconfig, ESLint 공용 설정.
- 공유 여부 판단: **두 앱에서 실제로 같은 코드를 쓰게 됐을 때** `packages/`로 옮깁니다. "나중에 쓸 것 같아서" 미리 옮기지 마세요.

## 화면 경로 (`apps/web/src/app/`)

| 그룹              | 경로                                                                                                                             | 화면               | 레이아웃                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------ |
| `(auth)/`         | `/login`, `/signup`, `/invite/[token]`                                                                                           | M-01, F-AUTH-01·02 | 폰·PC 공통, 가운데 정렬                                |
| `m/(tabs)/`       | `/m/chat`, `/m/requests`, `/m/briefing`                                                                                          | M-02~04            | 폰 폭 + 하단 탭                                        |
| `m/`              | `/m/reviews/[id]`                                                                                                                | M-05               | 폰 폭, 탭 없음                                         |
| `(desk)/`         | `/warehouse`                                                                                                                     | W-11 (PC 입구)     | 상단 메뉴 없음, 3D 전체 화면, 최소 1280px              |
| `(desk)/(pages)/` | `/dashboard`, `/reviews`, `/reviews/[id]`, `/parts`, `/parts/[id]`, `/audit`, `/hidden-stock`, `/setup`, `/reports`, `/settings` | W-01~10            | 3D 창고 메뉴에서 여는 상세 화면, "3D 창고로" 뒤로 가기 |

- **기기 라우팅은 `src/proxy.ts` 한 곳에서** 합니다. `/`는 폰이면 `/m/chat`, PC·태블릿이면 `/dashboard`로 보냅니다.
- 같은 대상을 가리키는 폰·PC 화면 쌍(`/reviews/[id]` ↔ `/m/reviews/[id]`)은 proxy가 기기에 맞는 쪽으로 옮깁니다. 새 쌍을 만들면 proxy의 `matcher`와 분기를 함께 추가합니다. 푸시·공유 링크는 어느 쪽 경로로 만들어도 됩니다.
- 메뉴·탭·링크 경로는 `src/constants/routes.ts`만 씁니다.
- 레이아웃에서 `usePathname()` 같은 요청 시점 값을 읽는 클라이언트 컴포넌트는 `<Suspense>`로 감쌉니다. Cache Components가 켜져 있어 감싸지 않으면 동적 경로(`/parts/[id]`) 빌드가 실패합니다(이전 `DeskTopBar`가 그랬다). `params`를 읽는 부분도 같습니다.

## 앱 내부 (타입 중심, `apps/web/src/`)

- 라우트는 `src/app/`(App Router). 별도의 `src/features/` 디렉토리는 사용하지 않습니다.
  - 라우트 전용 컴포넌트는 해당 라우트 폴더의 `_components/`에 둘 수 있습니다. (`_` 접두사 폴더는 라우팅에서 제외됩니다)
  - URL에 영향 없는 그룹은 `(group)` 폴더를 씁니다.
- 컴포넌트는 `src/components/` 하위에서 다음 기준으로 분류합니다:
  - **Figma 디자인 시스템 컴포넌트**(Button·StatusChip·Input·Card)는 `@bjk/ui`에서 가져옵니다. 앱에 다시 만들지 마세요.
  - **앱 안에서만 쓰는 도메인 무관 UI**: `src/components/ui/`
    - 예: `PageHeader.tsx`, `layout/BottomTabBar.tsx`
    - 이 폴더 내부는 도메인이 아니라 **UI 종류/성격** 기준으로만 하위 폴더를 나눕니다. (예: `input/`, `feedback/`, `layout/`)
  - **특정 도메인 전용 컴포넌트**: `src/components/<도메인>/`
    - 도메인명으로 `src/components/ui/` **하위에** 폴더를 만들지 마세요.
  - 판단 기준: 다른 도메인에서도 그대로 재사용 가능하면 `ui/`, 특정 도메인 전용이면 `components/<도메인>/`.
  - 레이아웃 셸(상단 바, 탭 바): `src/components/layout/`. 폰 화면 전용 조합은 `components/mobile/`, PC 전용은 `components/desk/`.
- 커스텀 훅: 도메인 훅은 `src/hooks/<도메인>/`, 도메인 무관 훅은 `src/hooks/` 바로 아래.
- 앱 전용 타입(폼 상태, UI 타입): `src/types/` / 상수: `src/constants/` / 포맷 함수(원, 수량, 계산 기준 시각): `src/utils/`
- 클라이언트 전역 상태(Zustand 스토어): `src/stores/<이름>Store.ts`
- 전역 Provider: `src/providers/`
