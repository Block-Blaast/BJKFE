# 디렉토리 구조

## 모노레포

- `apps/user`, `apps/admin`: Next 앱. 서로 import 하지 않습니다.
- `packages/api`: 두 앱이 함께 쓰는 서버 연동 코드. React 컴포넌트·훅(`useQuery` 호출)은 두지 않습니다.
- `packages/config`: tsconfig, ESLint 공용 설정.
- 공유 여부 판단: **두 앱에서 실제로 같은 코드를 쓰게 됐을 때** `packages/`로 옮깁니다. "나중에 쓸 것 같아서" 미리 옮기지 마세요.

## 앱 내부 (타입 중심, `apps/<앱>/src/`)

- 라우트는 `src/app/`(App Router). 별도의 `src/features/` 디렉토리는 사용하지 않습니다.
  - 라우트 전용 컴포넌트는 해당 라우트 폴더의 `_components/`에 둘 수 있습니다. (`_` 접두사 폴더는 라우팅에서 제외됩니다)
  - URL에 영향 없는 그룹은 `(group)` 폴더를 씁니다.
- 컴포넌트는 `src/components/` 하위에서 다음 기준으로 분류합니다:
  - **도메인 무관 공용 UI(디자인 시스템)**: `src/components/ui/`
    - 예: `Button.tsx`, `Typography.tsx`, `input/TextInput.tsx`
    - 이 폴더 내부는 도메인이 아니라 **UI 종류/성격** 기준으로만 하위 폴더를 나눕니다. (예: `input/`, `feedback/`, `layout/`)
  - **특정 도메인 전용 컴포넌트**: `src/components/<도메인>/`
    - 도메인명으로 `src/components/ui/` **하위에** 폴더를 만들지 마세요.
  - 판단 기준: 같은 앱의 다른 도메인에서도 그대로 재사용 가능하면 `ui/`, 특정 도메인 전용이면 `components/<도메인>/`.
- 커스텀 훅: 도메인 훅은 `src/hooks/<도메인>/`, 도메인 무관 훅은 `src/hooks/` 바로 아래.
- 앱 전용 타입(폼 상태, UI 타입): `src/types/` / 상수: `src/constants/`
- 클라이언트 전역 상태(Zustand 스토어): `src/stores/<이름>Store.ts`
- 전역 Provider: `src/providers/`
