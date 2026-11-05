// 화면 전환 방향(View Transition 타입). 목록 → 상세 링크는 FORWARD, 상세의 "상위로" 링크는 BACK 을 붙인다.
// 타입이 없는 이동(필터 바꾸기 router.replace, 브라우저 뒤로 가기)은 미끄러지지 않는다 — globals.css 의 .nav-* 참고
export const NAV_FORWARD = ['nav-forward'];
export const NAV_BACK = ['nav-back'];
