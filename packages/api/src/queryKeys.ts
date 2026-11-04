// 쿼리 키 팩토리. 훅에서 문자열 배열을 직접 쓰지 말고 여기에 도메인별로 추가한다.
// 형태: { all: ['도메인'] as const, list: (...) => [...all, 'list', ...] as const, detail: (id) => [...all, 'detail', id] as const }
// 무효화는 도메인의 `all`로 하면 접두사가 같은 목록·상세가 함께 갱신된다.
// user·admin이 같은 키를 쓰므로 앱 안에서 키를 따로 만들지 않는다.
export const queryKeys = {} as const;
