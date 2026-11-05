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
| 기타   | `rounded-md`·`rounded-xl`·`rounded-full`, `shadow-card`, `shadow-raised`                       |

- `bg-bg-*`처럼 이름이 겹치는 것은 의도입니다. Figma 변수명(`--bg-brand`)과 1:1이라 검색이 쉽습니다.
- 타이포 토큰에 굵기·행간·자간이 들어 있습니다. `font-bold`, `leading-*`, `tracking-*`을 덧붙이지 마세요.
- Tailwind 기본 색·반경·그림자·글자 크기(`bg-white`, `text-sm`, `rounded-lg`, `shadow-md` …)는 초기화되어 **존재하지 않습니다.**

## 원칙 (`pnpm lint`와 편집 hook이 1~4를 검사)

1. 컴포넌트에는 **시맨틱 토큰만** 씁니다. 프리미티브(`bg-brand-600`, `text-gray-700`)는 일러스트·장식에만 씁니다. (예외: 8번)
2. hex 하드코딩, 임의값 클래스(`bg-[#...]`, `p-[13px]`, `w-[60px]`, `rounded-[..]`) 금지. 크기도 기본 스케일(`w-24`, `max-w-md`)을 씁니다.
3. 모서리는 세 가지만 씁니다 (2026-11-05 디자인 개편).
   - `rounded-md`(12px): 폼 입력창, 카드 **안에** 들어가는 작은 칸·상자(체크 근거, 병합 후보 칸, 확인 단계 상자)
   - `rounded-xl`(20px): 카드·패널·섹션 같은 큰 면
   - `rounded-full`: 버튼·칩·태그·내비·아이콘 버튼·아바타, **필터 선택·한 줄 검색·채팅 입력** 같은 알약·원형
   - `xl`은 코드가 먼저 추가한 값이라 Figma Foundations에 반영이 필요합니다.
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
- 토큰·컴포넌트 렌더링은 `/design-tokens` 임시 페이지에서 Figma와 대조합니다.
- 숫자 옆에는 계산 기준 시각(`ComputedAt`)을 붙이고, 금액·수량은 `src/utils/format.ts`로 표시합니다(명세서 15장 화면 규칙).

## 차트 (Recharts)

- 재고 그래프는 `src/components/charts/`의 `ForecastPanel` → `StockForecastChart`를 씁니다. 차트 라이브러리는 `next/dynamic`으로 차트가 있는 화면에서만 불러옵니다(폰 화면 번들에 넣지 않기).
- 시리즈 색은 `StockForecastChart`의 `SERIES` 한 곳에서 정합니다. 색은 시나리오(발주 `brand-600` / 미발주 `sub-700`), 선 모양은 실적(실선) / 예측(점선)을 구분합니다. 이 쌍은 dataviz 팔레트 검사를 통과한 조합이라 바꾸면 다시 검사합니다.
- 차트용 시맨틱 토큰이 없어 시리즈 색에 한해 프리미티브(`var(--color-brand-600)`)를 씁니다. 축·격자·기준선·글자는 시맨틱 토큰(`--border-default`, `--text-secondary`)을 씁니다.
- 상태색(빨강·주황·초록)은 시리즈 색으로 쓰지 않습니다. 축은 하나만(이중 축 금지), 격자·기준선은 실선, 점선은 예측선에만 씁니다.
- 범례(시리즈 2개 이상), 호버 툴팁(값 먼저), "표로 보기"를 항상 함께 둡니다. 툴팁에서만 볼 수 있는 값이 있으면 안 됩니다.

## 화면 인상 (2026-11-05 디자인 개편 — 참고: Boltshift 대시보드, Yandex Disk 포스터)

- **떠 있는 흰 카드**: PC는 `bg-bg-canvas`(gray-200) 바탕 → `bg-bg-page`(gray-50) 패널(`rounded-xl`) → 흰 카드(`bg-bg-surface rounded-xl shadow-card`) 3겹입니다. 바탕이 패널보다 확실히 어두워야 패널이 떠 보여요. 카드 사이 간격은 `gap-5`~`gap-6`.
- **큰 숫자, 굵은 제목**: 핵심 숫자는 `text-display`, 화면 제목은 `text-h1`. 부제는 `text-body-md text-text-secondary` 한 줄.
- **강조 카드는 한 화면에 하나**: 가장 중요한 숫자 카드만 `bg-bg-brand bg-linear-to-br from-brand-600 via-brand-500 to-brand-300 text-text-on-brand print:text-text-heading`. 참고(Boltshift) 강조 카드를 픽셀로 재 보니 우리 primary `brand-500`에서 `brand-300` 밝기로 빠지는 흐름이라 같은 램프로 재현했습니다. 글씨 배치로 원칙 5를 지킵니다: **라벨은 왼쪽 위(brand-600, 대비 5.2), 가운데(brand-500, 3.9)에는 큰 숫자(`text-display`)만, 오른쪽 아래(brand-300)에는 글씨를 두지 않습니다.** 작은 보조 문구는 흰 칩 안에 넣습니다. 인쇄하면 그라데이션이 빠지므로 글씨를 본문색으로 바꿉니다(원칙 12).
- **알약 컨트롤**: 내비·필터·버튼은 `rounded-full`. 선택된 내비·탭은 **검정**(`bg-bg-inverse text-text-on-inverse`) — 파랑은 강조 카드·주 버튼에 아껴 써서, 화면의 대비는 파랑 + 검정 두 색으로 만듭니다.
- **아이콘은 꽉 찬 동그란 칩 안에**: `components/ui/IconCircle` — 흰색(강조 카드 위)·검정·파랑·파랑 그라데이션 네 가지. 연한 바탕 원은 쓰지 않습니다. 한 줄의 카드들은 서로 다른 톤을 섞어 리듬을 줍니다.
- **공용 부품을 먼저 쓴다** (`src/components/ui/`): 알약 묶음 선택 `Segmented`(선택은 검정), 선택 상자 `Select`(`variant` pill·field — 맨 `<select>` 금지, 기본 화살표가 끝에 붙는다), 검색·입력 클래스 `controls.ts`(`PILL_SEARCH`, 라벨 없는 폼 칸 `FIELD`), 켜고 끄는 필터는 체크박스 대신 `aria-pressed` 알약(켜지면 검정), 빈 화면 `EmptyState`(작은 일러스트), 불러오기 실패 `ErrorState`(빗나간 빛 일러스트 + 다시 시도, 카드 안 작은 자리는 `size="inline"`), 동그란 뒤로 가기 `BackLink`, 아이콘 원 `IconCircle`. 같은 모양을 화면에서 다시 만들지 않습니다.
- **표는 `components/ui/table.ts`만 쓴다** (참고: Loseva 타임시트 표): 줄 사이 선 없이 둥근 회색 머리줄(`TH`, `bg-bg-subtle`) + 흰색·연회색(`bg-bg-page`) 줄무늬(`TR`)로 행을 나눕니다. 표만 있는 화면은 `TABLE_CARD`(흰 카드)에 담습니다. 표 안 칩은 줄무늬에 묻히지 않게 흰 바탕 + 테두리를 씁니다.
- **묶음 고르기는 폴더 카드** (참고: Kintsugi): 카테고리·종류를 고르는 큰 선택지는 `components/ui/FolderCard`(그림은 `illustration/FolderArt`)를 씁니다. 선택된 폴더만 파랑, 한 줄에 5개(`grid-cols-5 gap-5`). 글씨는 앞판(위 40%부터)에만 둡니다.
- **상세 화면은 가운데 본문 + 오른쪽 정보 패널**: 맨 위 `Breadcrumb`(뒤로 원 | 상위 › 지금), 오른쪽에 `components/ui/InfoPanel`의 막대 카드(`MeterCard` + `Meter`) → 속성 목록(`PropertyList`) → 점 태그(`DotTag`) 순서(`PartInfoPanel`, `ReviewInfoPanel` 참고).
- **카드 제목은 `text-h3`**, 카드 안 소제목은 `text-label-lg`.
- **위트는 브랜드 순간에만**: 빈 화면·로그인·브리핑 머리 같은 곳에서만 파랑+노랑 일러스트(`components/illustration/`)를 씁니다. 데이터 화면에는 넣지 않습니다.

## 그 밖의 스타일 규칙

- 스타일은 Tailwind 클래스로 씁니다. 인라인 `style={{...}}`은 런타임에 계산되는 값(드래그 위치 등)에만 씁니다.
- 조건부 클래스를 템플릿 문자열로 조각내 만들지 마세요(`` `bg-${color}-500` `` X). Tailwind가 감지하지 못합니다. 완성된 클래스명을 분기합니다.
- 앱 전용으로 조합한 UI(목록 행, 폼 섹션 등)는 그 앱의 `src/components/`에 둡니다. 두 앱이 같이 쓰게 되면 `packages/ui`로 옮깁니다.
