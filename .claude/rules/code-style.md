---
paths:
  - 'apps/*/src/**/*.{ts,tsx,js,jsx}'
  - 'packages/*/src/**/*.ts'
---

# 코딩 스타일

- 함수형 컴포넌트, 훅, 그리고 명확한 TypeScript 타입을 사용하세요. `any`는 쓰지 않습니다.
- **컴포넌트는 화살표 함수로 선언하고, 파일 맨 아래에서 export 합니다.** (ESLint `react/function-component-definition`이 강제)

  ```tsx
  type ProfileCardProps = {
    name: string;
  };

  const ProfileCard = ({ name }: ProfileCardProps) => {
    return <div>{name}</div>;
  };

  export default ProfileCard;
  ```

  - `page.tsx`, `layout.tsx` 등 Next 특수 파일도 같은 형태입니다. (`const HomePage = () => {}` + `export default HomePage`)
  - props 타입은 `<컴포넌트명>Props`로 이름 짓고 `type`으로 선언합니다.
  - 훅·유틸 함수도 화살표 함수(`export const useFoo = () => {}`)로 씁니다.

- 컴포넌트 파일명은 PascalCase(`ProfileCard.tsx`), 훅은 `useXxx.ts`, 그 외는 camelCase입니다. 라우트 폴더는 kebab-case입니다.
- 앱 안에서는 `@/` 별칭(`apps/<앱>/src/*`)을 씁니다. 같은 폴더 안이 아니라면 `../` 상대 경로를 쓰지 마세요.
- 내부 패키지는 패키지 이름으로 import 합니다(`@bjk/api/client`). `../../packages/...` 같은 상대 경로는 금지입니다.
- `packages/*` 안에는 `@/` 별칭이 없습니다. 패키지 내부 import는 상대 경로를 씁니다.

## 서버 컴포넌트 · 클라이언트 컴포넌트

- 기본은 **서버 컴포넌트**입니다. 상태·이벤트 핸들러·브라우저 API·TanStack Query 훅·Zustand가 필요할 때만 `'use client'`를 붙입니다.
- `'use client'`는 가능한 한 **트리의 잎(작은 컴포넌트)** 에 둡니다. 페이지 전체를 클라이언트로 만들지 마세요.
- `page.tsx`의 `params`, `searchParams`는 Promise입니다. `await` 해서 씁니다.
- 이미지는 `next/image`, 내부 링크는 `next/link`를 씁니다.

## 주석

- **주석은 코드만 봐서는 알 수 없는 "왜"만 짧게 남깁니다.** 서버 제약·특이 동작, 브라우저 우회책, 지우면 버그가 나는 이유, 함정(gotcha)이 대상입니다.
- 이름·타입이 이미 말해주는 내용, 화면 묘사, JSX 섹션 라벨(`{/* 헤더 */}`)은 쓰지 마세요.
- 기존의 "왜" 주석은 근거 없이 지우지 마세요. 코드를 바꿔 주석이 틀려졌다면 주석도 함께 고칩니다.
- `eslint-disable`, `@ts-expect-error` 같은 도구용 주석은 건드리지 마세요.

## 메모이제이션

- `useMemo`, `useCallback`, `React.memo`를 **습관적으로 쓰지 마세요.** 측정된 성능 문제가 있거나 참조 동일성이 외부 계약상 필요할 때만 씁니다.
