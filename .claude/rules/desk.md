---
paths:
  - 'apps/web/src/app/(desk)/**'
  - 'apps/web/src/components/desk/**'
  - 'apps/web/src/components/layout/Desk*'
  - 'apps/web/src/components/layout/FlowBand*'
  - 'apps/web/src/constants/routes.ts'
---

# 웹 화면 — PC (W-01~10)

사무실의 책상입니다. 관리자가 기준 정보를 넣고 현황을 보며, 사장님이 설정합니다.

- **데스크톱 전용**입니다. 모바일 대응은 하지 않습니다. `app/(desk)/layout.tsx`가 최소 폭 1280px(`min-w-7xl`)과 상단 알약 내비(`DeskTopBar`)를 줍니다.
- 상단 내비는 **발주 흐름 5단계**(`components/layout/FlowBand`)입니다: ①현장 기록 `/warehouse` → ②자동 검토 `/reviews?status=all` → ③사장님 결정 `/reviews` → ④발주·납기 `/reports` → ⑤입고 검수 `/audit`. 단계는 `src/constants/routes.ts`의 `DESK_FLOW`만 고칩니다. 대시보드(`/dashboard`)는 메뉴가 아니라 **로고**가 입구이고, 설정은 오른쪽 톱니(`DESK_SETTINGS`)입니다(v2).
  - 현재 단계는 검정 알약, ②와 ③은 같은 `/reviews`라 `?status=all` 유무로 가릅니다(`DESK_FLOW`의 `status`). 결정 대기 건수는 ③의 파란 숫자 배지(`PendingReviewBadge`)로만 강조합니다.
  - 한 단계에 묶인 화면(①의 3D 창고·부품·숨은 재고, 톱니의 기준 정보·직원·설정)은 `DESK_SUB_NAV`의 하위 탭으로 고릅니다.
- 3D 창고(`/warehouse`, W-11 디지털 트윈)는 **계산하지 않고 그리기만** 합니다. 날짜별 재고·상태·설비 영향·손실은 `GET /twin/projection`(서버 경로 시뮬레이션의 중앙값)에서 오고, 색 기준은 기존 판정과 같습니다(결품 확률 30% 이상 빨강, 재주문점 이하 주황). three.js는 이 화면에서만 `next/dynamic`(ssr: false)으로 불러오고, 재질 색은 CSS 변수(토큰)를 실행 시점에 읽습니다. 같은 내용을 "표" 보기로도 볼 수 있어야 합니다. 재고·검토가 바뀌는 요청은 `queryKeys.twin.all`도 무효화합니다.
- 목록 화면의 필터·정렬·페이지 상태는 **URL 쿼리스트링**에 둡니다. 새로고침·뒤로 가기·링크 공유 시 상태가 유지되어야 합니다. Zustand에 두지 마세요.
- 병합·실사 조정·역할 변경처럼 되돌릴 수 없는 작업은 확인 단계를 거칩니다.
- 실시간(○ 표시 화면: W-01~06)은 SSE 이벤트로 해당 쿼리를 무효화해서 갱신합니다. 화면에서 따로 폴링하지 마세요.
