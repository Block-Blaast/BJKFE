---
paths:
  - 'apps/web/src/app/(desk)/**'
  - 'apps/web/src/components/desk/**'
  - 'apps/web/src/components/layout/Desk*'
---

# 웹 화면 — PC (W-01~10)

사무실의 책상입니다. 관리자가 기준 정보를 넣고 현황을 보며, 사장님이 설정합니다.

- **데스크톱 전용**입니다. 모바일 대응은 하지 않습니다. `app/(desk)/layout.tsx`가 최소 폭 1280px(`min-w-7xl`)과 사이드바를 줍니다.
- 사이드바 메뉴는 `src/constants/routes.ts`의 `DESK_NAV`만 고칩니다.
- 목록 화면의 필터·정렬·페이지 상태는 **URL 쿼리스트링**에 둡니다. 새로고침·뒤로 가기·링크 공유 시 상태가 유지되어야 합니다. Zustand에 두지 마세요.
- 병합·실사 조정·역할 변경처럼 되돌릴 수 없는 작업은 확인 단계를 거칩니다.
- 실시간(○ 표시 화면: W-01~06)은 SSE 이벤트로 해당 쿼리를 무효화해서 갱신합니다. 화면에서 따로 폴링하지 마세요.
