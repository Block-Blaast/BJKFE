---
paths:
  - 'apps/*/src/**'
  - 'packages/ui/**'
---

# 디자인 시스템 · 스타일 (공통)

기준(source of truth)은 Figma `sJfs73BOfgYtBrAB3Xx8si`(Foundations / Components)입니다. 토큰은 `packages/ui/src/tokens.css` **한 파일**에만 있고, 두 앱이 `@bjk/ui/styles.css`로 함께 씁니다. 값을 추측하거나 새 토큰을 만들지 마세요. Figma가 바뀌면 `scripts/verify-tokens.mjs`의 기대값 → `tokens.css` 순서로 고칩니다.

## 토큰 쓰는 법

| 종류   | 클래스 예                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------- |
| 배경   | `bg-bg-page`, `bg-bg-surface`, `bg-bg-brand`, `hover:bg-bg-brand-hover`, `bg-bg-danger-subtle` |
| 글자   | `text-text-heading`, `text-text-body`, `text-text-secondary`, `text-text-on-brand`             |
| 테두리 | `border-border-default`, `border-border-strong`, `border-border-brand`, `ring-border-danger`   |
| 아이콘 | `text-icon-brand`, `text-icon-danger`, `text-icon-success`, `text-icon-warning`                |
| 타이포 | `text-display`, `text-h1`~`text-h3`, `text-body-lg/md/sm`, `text-label-lg/md/sm`               |
| 기타   | `rounded-md`, `shadow-card`, `shadow-raised`                                                   |

- `bg-bg-*`처럼 이름이 겹치는 것은 의도입니다. Figma 변수명(`--bg-brand`)과 1:1이라 검색이 쉽습니다.
- 타이포 토큰에 굵기·행간·자간이 들어 있습니다. `font-bold`, `leading-*`, `tracking-*`을 덧붙이지 마세요.
- Tailwind 기본 색·반경·그림자·글자 크기(`bg-white`, `text-sm`, `rounded-lg`, `shadow-md` …)는 초기화되어 **존재하지 않습니다.**

## 원칙 (`pnpm lint`와 편집 hook이 1~4를 검사)

1. 컴포넌트에는 **시맨틱 토큰만** 씁니다. 프리미티브(`bg-brand-600`, `text-gray-700`)는 일러스트·장식에만 씁니다. (예외: 8번)
2. hex 하드코딩, 임의값 클래스(`bg-[#...]`, `p-[13px]`, `w-[60px]`, `rounded-[..]`) 금지. 크기도 기본 스케일(`w-24`, `max-w-md`)을 씁니다.
3. 모서리는 `rounded-md`(12px) 하나. 한쪽만 둥글게 할 때도 `rounded-t-md`처럼 md만 씁니다.
4. 간격(`p`, `m`, `gap`, `space`)은 **0, 1, 2, 3, 4, 5, 6, 8, 12 단계만** (4/8/12/16/20/24/32/48px, Figma `spacing/N`과 1:1).
5. `brand-500`(#0E7DFF)은 큰 면·일러스트용입니다. 흰 글씨 배경으로 쓰지 않습니다(대비 3.89). 버튼·링크는 `bg-bg-brand`(brand-600).
6. gray-400 이하는 텍스트에 쓰지 않습니다. 예외는 disabled(`text-text-disabled`)뿐입니다.
7. 상태색 원색(500)은 텍스트에 쓰지 않습니다. 글씨는 `text-text-danger` 같은 700 계열 시맨틱 토큰을 씁니다.
8. 옐로(`sub`)는 의미를 담지 않습니다(하이라이트·장식). 옐로 배경 위 글씨는 `text-gray-900`입니다.
9. 상태는 **색 + 아이콘 + 텍스트 라벨**을 항상 함께 보여줍니다(흑백 인쇄 대비). 주문 상태는 `StatusChip`을 씁니다.
10. 수량·표의 숫자는 `tabular-nums`.
11. 다크 모드는 없습니다. `dark:` 변형이나 `prefers-color-scheme`을 쓰지 마세요.
12. 인쇄 시 그림자·그라데이션은 `tokens.css`의 `@media print`가 제거합니다. 인쇄에 의미가 필요한 정보를 그림자·그라데이션으로만 표현하지 마세요.

## 컴포넌트

Figma 컴포넌트와 같은 것은 `@bjk/ui/components/*`에 있습니다. 앱에서 새로 만들지 말고 가져다 씁니다.

| 컴포넌트     | import                          | 변형                                                                                  |
| ------------ | ------------------------------- | ------------------------------------------------------------------------------------- |
| `Button`     | `@bjk/ui/components/Button`     | `variant`: primary·secondary·ghost / `size`: md·lg                                    |
| `StatusChip` | `@bjk/ui/components/StatusChip` | `status`: approve(승인 필요)·missed(놓친 발주)·unneeded(발주 불필요)·check(확인 요청) |
| `Input`      | `@bjk/ui/components/Input`      | `label`, `helperText`, `error`(boolean·문구), `disabled`                              |
| `Card`       | `@bjk/ui/components/Card`       | `variant`: default(그림자)·highlight(브랜드 연한 배경)                                |

- 테두리를 2px로 키울 때는 `border`(1px)에 `ring-1 ring-inset`을 겹쳐 레이아웃이 밀리지 않게 합니다(Input Focus/Error 참고).
- 토큰·컴포넌트 렌더링은 `apps/user`의 `/design-tokens` 임시 페이지에서 Figma와 대조합니다.

## 그 밖의 스타일 규칙

- 스타일은 Tailwind 클래스로 씁니다. 인라인 `style={{...}}`은 런타임에 계산되는 값(드래그 위치 등)에만 씁니다.
- 조건부 클래스를 템플릿 문자열로 조각내 만들지 마세요(`` `bg-${color}-500` `` X). Tailwind가 감지하지 못합니다. 완성된 클래스명을 분기합니다.
- 앱 전용으로 조합한 UI(목록 행, 폼 섹션 등)는 그 앱의 `src/components/`에 둡니다. 두 앱이 같이 쓰게 되면 `packages/ui`로 옮깁니다.
