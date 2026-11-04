---
paths:
  - 'packages/api/**'
  - 'apps/*/src/hooks/**'
  - 'apps/*/src/app/**'
---

# API 연동 규약

> 백엔드 명세(응답 래퍼, 인증, 에러 형식)는 아직 정해지지 않았습니다. 정해지면 이 문서와 `packages/api/src/client.ts`를 함께 갱신합니다. 그 전까지 응답 형식을 추측해서 타입을 만들지 마세요.

서버 연동 코드는 **api 모듈 → 훅 → 화면** 3계층으로 나눕니다. api 모듈은 `packages/api`, 훅부터는 `apps/web`에 둡니다.

| 계층      | 위치                                  | 책임                                                                      |
| --------- | ------------------------------------- | ------------------------------------------------------------------------- |
| 타입      | `packages/api/src/types/<도메인>.ts`  | 요청·응답 타입                                                            |
| api 모듈  | `packages/api/src/<도메인>.ts`        | 엔드포인트 호출. 공통 래퍼가 있다면 벗겨서 도메인 값만 반환               |
| 쿼리 옵션 | `packages/api/src/<도메인>.ts`        | `queryOptions()`로 키 + 호출 함수를 묶음 (폰·PC 화면이 같은 캐시 키 사용) |
| 훅        | `apps/web/src/hooks/<도메인>/use*.ts` | `useQuery`/`useMutation`. 캐시 무효화 담당                                |
| 화면      | `apps/web/src/app/**`, 컴포넌트       | 로딩·에러 UI, 토스트 등 **사용자에게 보이는 것**                          |

- 판정(`보류`/`수정 권고`/`적정`), 체크 코드(C-01~09), 상태 전이, 역할 권한은 `packages/api/src/domain/`에 있습니다. 화면에서 문자열을 직접 쓰지 말고 이 상수를 씁니다. OpenAPI가 나오면 그 enum과 대조해 맞춥니다.
- 새 파일을 만들면 `packages/api/package.json`의 `exports`에 경로를 추가합니다.

## api 모듈

- 모든 요청은 `@bjk/api/client`의 `request`를 거칩니다. 앱에서 `fetch`를 직접 호출하지 마세요.
- **서버가 주지 않는 값을 반환 타입에 적지 마세요.**

## 쿼리 키 · 캐시 무효화

- `packages/api/src/queryKeys.ts`의 팩토리만 사용합니다. 훅에 문자열 배열을 직접 쓰지 마세요. 새 도메인은 여기에 키를 먼저 추가합니다.
- 무효화는 도메인의 `all`을 씁니다. 접두사가 겹치므로 목록과 상세가 함께 갱신됩니다.
- 다른 도메인 데이터까지 바뀌는 요청이면 그 키도 함께 무효화합니다.

## 에러 처리 · 로딩 UI

- 실패하면 `request`가 `ApiError`(status, body 포함)를 던집니다.
- **토스트는 화면에서 띄웁니다.** 훅의 `onError`와 호출부의 `onError`가 둘 다 실행되므로, 훅에 넣으면 같은 메시지가 두 번 뜹니다.
- 재시도·`staleTime` 기본값은 `packages/api/src/queryClient.ts`에 있습니다. 훅에서 꼭 필요할 때만 덮어쓰세요.

## 실시간 · 멱등성 (명세서 F-NOTI-04, F-LEDGER-01, F-APPROVAL-02)

- SSE 이벤트(`stock.changed`, `review.created`, `review.decided`, `audit.flagged`)는 한 곳에서 받아 해당 도메인 쿼리 키를 무효화합니다. 화면마다 따로 구독하지 않습니다.
- 채팅 기록은 프론트에서 `client_message_id`(UUID)를 만들어 보냅니다. 재전송해도 서버가 중복을 막습니다.
- 승인 요청에는 `Idempotency-Key`를 붙이고, 409는 "이미 처리된 요청"으로 안내합니다.

## 서버 상태 vs 클라이언트 상태

- 서버에서 온 데이터는 **TanStack Query 캐시가 유일한 출처**입니다. Zustand 스토어에 복사해 두지 마세요.
- Zustand는 모달 열림, 필터 선택처럼 서버와 무관한 UI 상태에만 씁니다.

## 새 도메인 연동 절차

1. `packages/api/src/types/<도메인>.ts`에 요청·응답 타입
2. `packages/api/src/queryKeys.ts`에 쿼리 키 추가
3. `packages/api/src/<도메인>.ts`에 호출 함수와 `queryOptions`, `package.json`의 `exports` 추가
4. `apps/web/src/hooks/<도메인>/`에 훅
5. 화면에 훅 연결
