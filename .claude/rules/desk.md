---
paths:
  - 'apps/web/src/app/(desk)/**'
  - 'apps/web/src/components/desk/**'
  - 'apps/web/src/components/layout/Desk*'
  - 'apps/web/src/constants/routes.ts'
---

# 웹 화면 — PC (W-01~10)

사무실의 책상입니다. 관리자가 기준 정보를 넣고 현황을 보며, 사장님이 설정합니다.

- **데스크톱 전용**입니다. 모바일 대응은 하지 않습니다. `app/(desk)/layout.tsx`가 최소 폭 1280px(`min-w-7xl`)을 줍니다.
- **상단 메뉴(헤더)가 없습니다(v3).** PC 첫 화면(`/`)은 **3D 창고**(`/warehouse`)이고(`proxy.ts`, 안전망 `app/page.tsx`), 모든 기능은 3D 창고에서 시작합니다.
  - 칸·부품에 붙은 간단한 일(조회, 검색, 승인 요약, 실사 요청, 채팅 기록)은 3D 위 오른쪽 패널·서랍에서 합니다. 되돌릴 수 없는 일(승인, 병합)은 **확인 모달**을 거칩니다.
  - 정보가 많은 일(체크 9가지·반려, 부품 원장·예측, 목록 전체, 기준 정보·설정)은 **상세 페이지**로 보냅니다. 기존 화면들은 `app/(desk)/(pages)/`에 있고, 3D 창고 왼쪽 위 메뉴(`WarehouseMenu`, 상수 `DESK_MENU`)에서 열며, 각 화면 위에는 `DESK_HOME`으로 돌아가는 `BackLink`만 둡니다.
- 3D 창고(`/warehouse`, W-11 디지털 트윈)는 **계산하지 않고 그리기만** 합니다. 재고·상태·설비 영향은 `GET /twin/projection?with_orders=false`의 **오늘 값**(`TODAY`, 날짜 배열의 0번)에서 오고(날짜 시뮬레이션 화면은 두지 않는다), 색 기준은 기존 판정과 같습니다(결품 확률 30% 이상 빨강, 재주문점 이하 주황). 3D 씬은 `apps/web/public/warehouse-3d.html`(three.js 포함)을 `<iframe>`으로 띄운 것이고, React는 그 위의 오버레이(`components/desk/warehouse/WarehouseView`)에서 `window.warehouse` 브릿지(`hooks/twin/useWarehouseBridge`: 선택·강조·카메라 이동)로만 씬을 조작합니다. 선택 칸·강조·층·보기 같은 화면 상태는 `stores/warehouseStore`에 둡니다. 재고·검토가 바뀌는 요청은 `queryKeys.twin.all`도 무효화합니다.
  - 3D 씬은 `apps/web/public/warehouse-3d.html`이며 디자인 린트 대상이 아닙니다(`scripts/design-rules.mjs`의 `isDesignChecked`가 `src/` 아래만 봅니다). 그 위의 React 레이어(`components/desk/warehouse/**`)는 디자인 규칙을 그대로 지킵니다.
  - 같은 내용을 **표** 보기(`WarehouseTable`, 3D↔표 전환은 `WarehouseViewToggle`의 `Segmented`)로도 볼 수 있어야 합니다. canvas는 키보드로 칸을 고를 수 없어 표가 유일한 길이므로, 표에서 칸으로 가는 조작은 반드시 `button`입니다(누르면 그 칸을 선택하고 3D로 날아감).
- 목록 화면의 필터·정렬·페이지 상태는 **URL 쿼리스트링**에 둡니다. 새로고침·뒤로 가기·링크 공유 시 상태가 유지되어야 합니다. Zustand에 두지 마세요.
- 병합·실사 조정·역할 변경처럼 되돌릴 수 없는 작업은 확인 단계를 거칩니다.
- 실시간(○ 표시 화면: W-01~06)은 SSE 이벤트로 해당 쿼리를 무효화해서 갱신합니다. 화면에서 따로 폴링하지 마세요.
