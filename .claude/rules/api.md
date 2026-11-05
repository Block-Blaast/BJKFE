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

## 목업 (백엔드 연동 전)

- 개발 모드에서 `NEXT_PUBLIC_API_URL`이 없으면 MSW가 API를 대신합니다. 핸들러·고정 데이터는 `packages/api/src/mocks/`, 시작은 `apps/web/src/providers/mock-provider.tsx`.
- 임시 계약(타입 `packages/api/src/types/`, 경로 `endpoints.ts`)은 명세서 필드를 따릅니다. 명세서에 없는 필드는 `// [추가]`로 표시합니다. OpenAPI가 나오면 생성 타입으로 교체하고 `[추가]` 필드부터 백엔드와 맞춥니다.
- 로그인 테스트 계정(PIN·이메일·초대 토큰)은 `packages/api/src/mocks/fixtures/auth.ts`에만 둡니다. 실제 계정 정보는 어디에도 쓰지 않습니다.
- 목업 데이터는 명세서 예시 값을 우선합니다. 명세서 예시 숫자는 바꾸지 않습니다.
  - 예외: 시연용 **가상 공장**(`mocks/fixtures/factory.ts`)의 부품·설비·공급사·이력은 명세서에 없는 값입니다. 파일 머리 주석에 "가상"임을 밝히고, 지표는 `fixtures/parts.ts`의 계산식으로만 만듭니다(손으로 숫자를 지어 넣지 않음).
  - 사용 이력은 부품 ID 씨앗의 결정적 난수로 만듭니다. 시연할 때마다 같은 화면이 나와야 합니다.
- 화면 렌더링을 막지 않습니다. 워커가 뜰 때까지는 `request()`만 기다립니다(`setRequestGate`).

## 서버 상태 vs 클라이언트 상태

- 서버에서 온 데이터는 **TanStack Query 캐시가 유일한 출처**입니다. Zustand 스토어에 복사해 두지 마세요.
- Zustand는 모달 열림, 필터 선택처럼 서버와 무관한 UI 상태에만 씁니다.

## 새 도메인 연동 절차

1. `packages/api/src/types/<도메인>.ts`에 요청·응답 타입
2. `packages/api/src/queryKeys.ts`에 쿼리 키 추가
3. `packages/api/src/<도메인>.ts`에 호출 함수와 `queryOptions`, `package.json`의 `exports` 추가
4. `apps/web/src/hooks/<도메인>/`에 훅
5. 화면에 훅 연결
