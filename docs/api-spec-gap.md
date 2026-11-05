# 백엔드 API 명세 대조 결과

- 대조일: 2026-11-05
- 백엔드 기준: `BJK-AI-BE` `origin/main`의 `docs/api-spec/` (마지막 갱신 `148302c`, 2026-11-05 18:08)와 라우터 코드 `apps/server/src/bjk_server/api/*.py`
- 프론트 기준: `main` (`b2a1fb8`)의 `packages/api/src/` (`endpoints.ts`, `client.ts`, 도메인별 API 함수, `types/`, `domain/`)

## 요약

- 프론트 API 계층은 아직 "임시 계약"(명세서 화면 단위로 추정한 형식)으로 동작하고, 백엔드 명세는 거의 반영되지 않았다.
- `/v1/...`로 옮긴 5개 경로(`emailLogin`, `pinLogin`, `companyMembers`, `parts`, `chatMessages`)도 응답 모양이 달라 실서버에 붙이면 깨진다.
- `Authorization: Bearer` 헤더를 붙이지 않고 토큰도 저장하지 않아, 인증이 필요한 API는 전부 401이 난다.
- 목업(MSW)이 모든 결과를 즉시·동기로 돌려줘서 비동기 검토, 블라인드 실사 같은 차이가 가려져 있었다.

## 1. 실서버에 붙이면 바로 깨지는 것

| 프론트                                                    | 문제                                                                                                                                                                                                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client.ts`                                               | `Authorization: Bearer {access_token}` 헤더가 없다. `useAuthMutations.ts`는 토큰을 저장하지 않는다(`TODO(auth)`). 인증이 필요한 API는 전부 401 `UNAUTHORIZED`                                                                               |
| `loginWithEmail` (`/v1/auth/login`)                       | 응답 `user`는 `{id, name, role}`뿐이고 `company`가 없다. 성공 처리에서 `result.user.company.code`를 읽어 TypeError                                                                                                                          |
| `loginWithPin` (`/v1/auth/pin-login`)                     | 위와 같다                                                                                                                                                                                                                                   |
| `getCompanyMembers` (`/v1/auth/companies/{code}/members`) | 응답은 `{ items: [{ user_id, name }] }`. 프론트는 `CompanyMember[]`(`id, name, role`)로 받는다                                                                                                                                              |
| `getParts` (`/v1/parts`)                                  | 응답은 `{ items, next_cursor }`. 항목 필드도 다르다(`category` 문자열, `demand_class`, `ledger_status`, `t_out`, `p_out`, `risk_level`, `computed_at`). 필터도 `category`→`category_id`, `pattern`→`demand_class`, `ledger_status` 추가     |
| `sendChatMessage` (`/v1/chat/messages`)                   | 응답은 `{ message_id, intent, reply, cards[], ai }`. 카드 키는 `entry_id`, `intent`는 `OUT`·`IN`·`QUERY`·`OTHER`·`MAINTENANCE_DONE`·`COUNT`·`PURCHASE_REQUEST`. 프론트는 `{ reply, card?, review_id? }`, `pending_id`, 한글 intent로 받는다 |

## 2. 공통 규칙 차이

| 항목      | 명세                                                                                                                                         | 프론트                                                                                                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Base URL  | 모든 기능 API는 `/api/v1` 아래                                                                                                               | 일부만 `/v1/...`, 나머지는 `/api/...`                                                                                                       |
| 인증      | `Authorization: Bearer`, 액세스 15분·리프레시 14일, `POST /auth/refresh`                                                                     | 헤더 없음, 토큰 저장 없음, refresh 없음                                                                                                     |
| 목록 응답 | `{ items, next_cursor }`, `?cursor=&limit=`(기본 20, 최대 100)                                                                               | 전부 배열로 받는다                                                                                                                          |
| 오류 형식 | `{ code, message, detail }`                                                                                                                  | `apiError.ts`가 `body.message`를 읽어 호환. 코드별 분기(`INVALID_PIN`의 `remaining_attempts`, `PIN_LOCKED`, `SNAPSHOT_REFRESHED` 등)는 없음 |
| 도메인 값 | 영문 코드. 검토 상태 `reviewing/reviewed/held/approved/closed/expired`, 판정 `ok/revise/hold`, 입구 `staff_request/stock_draft/missed_draft` | `domain/review.ts`가 `'검토완료'`, `'적정'` 같은 한글 값을 enum으로 쓴다. 코드 → 표시 문자열 매핑 필요                                      |
| 멱등성    | 채팅·폼은 본문 `client_message_id`, 검토 결정은 `Idempotency-Key` 헤더                                                                       | 채팅 `client_message_id`, 결정 헤더는 있음. 결정 키는 `snapshot_id` 기준인데 명세 상세는 `snapshot.id`                                      |
| 실시간    | `GET /events` SSE. 브라우저 `EventSource`는 헤더를 못 붙여 fetch 기반 클라이언트 필요                                                        | 없음                                                                                                                                        |

## 3. 경로·형식 차이 (프론트 → 명세)

### 인증·직원·설정

| 프론트                             | 명세                                   | 형식 차이                                                                                                           |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/signup`            | `POST /v1/auth/owner/signup`           | 응답에서 `company`가 최상위 키(`user` 안이 아님)                                                                    |
| `GET /api/invites/{token}`         | `GET /v1/auth/invites/{token}`         | 응답 `{ company_name, role, expires_at }`. 회사 코드 없음. 프론트는 `{ role, company: { name, code }, expires_at }` |
| `POST /api/invites/{token}/accept` | `POST /v1/auth/invites/{token}/accept` | 응답 최상위에 `company_code`, `user`에 `company` 없음                                                               |
| `POST /api/invites`                | `POST /v1/auth/invites`                | owner 전용. 응답 `{ token, join_url, role, expires_at }`                                                            |
| `GET /api/members`                 | `GET /v1/users`                        | owner 전용. `{ items: [{ id, name, role, email, has_pin, active }] }`                                               |
| `PATCH /api/members/{id}`          | `PATCH /v1/users/{id}`                 | `role`은 `worker`·`manager` 사이만                                                                                  |
| `GET·PUT /api/company/settings`    | `GET·PATCH /v1/settings`               | owner 전용. `notify`·`review`·`system` 구조, PATCH는 보낸 키만                                                      |

### 부품·원장

| 프론트                         | 명세                           | 형식 차이                                                                                                                                                                                                          |
| ------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/parts/{id}`          | `GET /v1/parts/{id}`           | `stock: { S, incoming, hidden: { H_c, H_u, parts }, ledger_status, last_counted_at }`, `metrics`(null 가능), `supplier_metrics`, `aliases[{ text, confirmed_count, ambiguous }]`. 모양이 크게 다름                 |
| `GET /api/parts/{id}/ledger`   | `GET /v1/parts/{id}/movements` | 커서 목록. 항목 `{ id, type, qty, occurred_at, author, source_text, equipment_id, maintenance_id, po_id, reason, corrects }`                                                                                       |
| `GET /api/parts/{id}/forecast` | `GET /v1/parts/{id}/forecast`  | `{ as_of, computed_at, start_stock, monthly_use, order_qty, lead_days, reorder_point, t_out, days: [{ date, with_order, without_order }] }`(57개 점). 프론트는 `actual`·`with_order[]`·`without_order[]` 배열 구조 |

### 발주 검토

| 프론트                            | 명세                             | 형식 차이                                                                                                                                                                                                                                                              |
| --------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/reviews`                | `GET /v1/reviews`                | 커서 목록. 항목 `{ id, entry, part(이름), status, verdict, flags, original_total, saving, created_at }`. 쿼리 `urgent=true`(프론트는 `1`), `min_total` 없음, `entry`·`mine` 추가                                                                                       |
| `GET /api/me/requests`            | `GET /v1/reviews?mine=true`      |                                                                                                                                                                                                                                                                        |
| `GET /api/reviews/{id}`           | `GET /v1/reviews/{id}`           | `requested_by`, `hold_reasons`, `alternatives`, `count_requests`, `opinion: { text, source, verified }`, `snapshot: { id, hash, values }`, `expires_at`. `part`는 이름 문자열                                                                                          |
| `POST /api/reviews/{id}/decision` | `POST /v1/reviews/{id}/decision` | action은 `approve_proposal`, `approve_original`, `approve_edited`(`edited`+`recheck_hash` 필수), `approve_alternative`(`alternative_id`), `accept_no_order`, `reject`(`reason` 필수). 프론트는 camelCase(`approveProposal`, `editAndApprove`). 응답에 `purchase_order` |
| `GET /api/reviews/{id}/forecast`  | `GET /v1/reviews/{id}/forecast`  | 부품 예측선과 같은 모양                                                                                                                                                                                                                                                |

### 브리핑·장부 검증·병합

| 프론트                                              | 명세                                      | 형식 차이                                                                                                                                                                                                                         |
| --------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/briefing`                                 | `GET /v1/briefing/today`                  | manager 이상. `{ date, generated_at, should_notify, missed_orders: { count, expected_loss_total, items }, pending_reviews, count_needed, order_check_needed, maintenance_check_needed }`(건수 위주). 프론트는 검토·실사 항목 목록 |
| `GET /api/audits`                                   | `GET /v1/audit-flags`                     | 커서 목록. `{ id, part, rule, level, status, evidence, related, ... }`                                                                                                                                                            |
| `POST /api/audits/{id}/request`                     | `POST /v1/audit-flags/{id}/count-request` | 요청 `{ assignee_id }`, 응답 `{ count_request_id, status, scheduled_for, message_preview }`                                                                                                                                       |
| `GET /api/merge-candidates`                         | `GET /v1/merge-candidates`                | 커서 목록. 상태 `open/count_requested/merged/different/closed`(프론트는 `dismissed` 사용)                                                                                                                                         |
| `POST /api/merge-candidates/{id}/merge`, `/dismiss` | `POST /v1/merge-candidates/{id}/decision` | `{ action: merge \| different \| request_count, representative_part_id }`                                                                                                                                                         |

### 채팅

| 프론트                                | 명세                                 | 형식 차이                                                                                                                                                     |
| ------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/chat/pending/{id}/confirm` | `POST /v1/chat/entries/{id}/confirm` | 요청 `{ part_id, qty, equipment_id }`(발주 요청은 `supplier_id`, `unit_price`). 응답은 intent별로 다름(`movement`, `stock_after`, `po_match`, `triggered` 등) |
| `POST /api/chat/pending/{id}/cancel`  | `POST /v1/chat/entries/{id}/cancel`  | 응답 `{ entry_id, status: "cancelled" }`                                                                                                                      |

### 기준 정보·발주

| 프론트                                         | 명세                                     | 형식 차이                                                                                                                                                                                                                |
| ---------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /v1/imports/parts` (연결함)              | `POST /v1/imports/parts`                 | 맞춤. multipart `file` → `{ import_id, is_reimport, rows[{ row, name, stock, unit, spec, suggested_category, existing_part_id, duplicate_suspects, errors, warnings }], ai }`. 카테고리 선택지는 `GET /v1/categories` id |
| `POST /v1/imports/parts/{id}/confirm` (연결함) | `POST /v1/imports/parts/{id}/confirm`    | 맞춤. `rows[{ row, category_id, spec, merge_with_part_id }]`, `stock_mode`(재이관은 `ignore` 또는 `preview` → `apply`)                                                                                                   |
| `GET·POST /api/setup/equipment`                | `GET·POST /v1/equipment`                 | 커서 목록, `parts[{ part_id, qty_per_maintenance }]`                                                                                                                                                                     |
| `GET·POST /api/setup/maintenance`              | `GET·POST /v1/maintenance`               | 커서 목록, `required_parts`, `parts_source`                                                                                                                                                                              |
| `POST /api/setup/maintenance/{id}/complete`    | `POST /v1/maintenance/{id}/complete`     |                                                                                                                                                                                                                          |
| `GET·POST /api/setup/suppliers`                | `GET·POST /v1/suppliers`                 | 커서 목록, `part_count`                                                                                                                                                                                                  |
| `POST /api/setup/suppliers/{id}/prices`        | `PUT /v1/suppliers/{id}/parts/{part_id}` | 통째로 바꿈, `price_tiers`, `moq`, `shipping_fee`                                                                                                                                                                        |
| `GET /api/purchase-orders`                     | `GET /v1/purchase-orders`                | 커서 목록. `pdf_url` 없음                                                                                                                                                                                                |

### 목업만 있고 서버에 API가 없는 것

> 갱신(2026-11-05): 배포 빌드에서 목업이 가로채는 경로(`mock-provider.tsx`의 `MOCK_ONLY`)는 이제 없다. 3D 창고는 백엔드 #281(`/v1/twin/*`)로, 엑셀 이관은 서버 스키마가 확정돼 `/v1/imports/parts`로 연결했다. 아래 표의 `/api/twin/*` 두 행도 해소됐다.

MSW 핸들러 46개(`mocks/handlers.ts`·`setup.ts`·`twin.ts`)를 백엔드 라우터와 대조한 결과, 경로를 바꿔도 대응하는 서버 API가 없는 것은 아래 6개다. `origin/main`, `origin/dev`, main에 아직 머지되지 않은 브랜치(`feat/review-count-notifications/#272`, `fix/api-spec-sync/#270`)에도 대응 라우트가 없다. 나머지 40개는 경로나 형식이 다를 뿐 서버에 대응 API가 있다(3장 표).

| 프론트 (목업)                | 쓰는 화면                                                                                                          | 서버 쪽 상황과 대안                                                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/activity/today`    | 대시보드(`Dashboard.tsx`) 오늘 활동 목록, `FlowBand.tsx`                                                           | 활동 목록 API 없음. `GET /v1/dashboard/summary`의 `today`는 건수(원장 기록·검토 생성·결정)만 준다. 한 줄씩 보이는 피드가 필요하면 백엔드에 요청하거나 건수 표시로 바꿔야 한다                                       |
| `GET /api/chat/inbox`        | 채팅(`ChatThread.tsx`) — 시스템이 작업자에게 먼저 보내는 메시지(실사 요청)                                         | 인박스 API 없음. 실사 요청은 알림(`GET /v1/notifications`, `kind: count_request`)으로 간다. 담당자 알림 생성은 `#272`(미머지)에서 추가 중. 응답은 채팅 `COUNT` 의도나 `POST /v1/count-requests/{id}/answer`         |
| `POST /api/chat/drafts/{id}` | 채팅(`ChatThread.tsx`) — `reorder` 카드를 눌러 재고 부족 검토 만들기                                               | 대응 API 없음. 서버는 출고 확정 시 조건이 맞으면 초안 검토를 자동으로 만들고 확정 응답 `triggered.draft_review_id`로 알린다. 작업자가 누르는 단계 자체가 없어 `reorder` 카드를 "검토가 올라갔다" 안내로 바꿔야 한다 |
| `GET /api/sim-reports`       | 리포트(`ReportsView.tsx`, `SimReportList.tsx`) — 검증 리포트(F-SIM) 목록                                           | 없음. api-spec에도 F-SIM 리포트 API가 없다(F-SIM은 매칭 임계값 등 "조정 대상" 언급뿐)                                                                                                                               |
| `GET /api/twin/layout`       | 없음. API 함수(`twin.ts`)와 쿼리 키 무효화만 남아 있고, W-11 3D 창고는 HTML 버전으로 되돌려 이 API를 부르지 않는다 | 없음(명세서 밖 화면). 지금은 영향 없음                                                                                                                                                                              |
| `GET /api/twin/projection`   | 위와 같다                                                                                                          | 위와 같다                                                                                                                                                                                                           |

### 경로는 있지만 목업만 주는 데이터

서버에 API는 있지만 목업이 만들어 주던 값 중 서버가 주지 않는 것이다. 경로를 맞춰도 화면에서 비게 된다.

| 화면 데이터                              | 목업                                     | 서버                                                                                                                       |
| ---------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 검토함 원안 총액 하한 필터               | `min_total` 쿼리                         | REV-01에 없음                                                                                                              |
| 재고 추이 그래프의 실적선                | `StockForecast.actual`(일별 마감 재고)   | 예측선 응답은 오늘부터 57일 `days`뿐. 과거 실적은 `GET /v1/parts/{id}/movements`로 직접 계산해야 한다                      |
| 발주 기록의 PDF 링크·승인 행동·희망 납기 | `pdf_url`, `action`, `desired_date`      | PO-01에 없음. PDF는 `GET /v1/reviews/{review_id}/pdf`(승인 후, Bearer 필요), 희망 납기는 PO-02 `order_message` 문장 안에만 |
| 실사 카드의 장부 수량                    | `ledger_qty`                             | 블라인드 실사라 응답 전에는 주지 않는다                                                                                    |
| 브리핑의 검토·실사 항목 목록             | 항목 배열                                | 건수만. 목록은 `GET /v1/reviews`, `GET /v1/audit-flags`로 따로 조회                                                        |
| 검토 요청자의 역할                       | `requester: worker/manager/owner/system` | `requested_by: { type, id, name }`(역할 없음), 시스템 초안은 `null`                                                        |

## 4. 백엔드에 있는데 프론트가 안 쓰는 API

### 4-1. 지금 문제가 되는 것

| API                                                                                    | 문제가 되는 상황                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/refresh`                                                                   | 액세스 토큰이 15분. 인증을 붙여도 refresh가 없으면 15분 뒤 모든 요청이 401이고 다시 로그인해야 한다. 인증 작업과 함께 넣어야 한다                                                                                                                  |
| `GET /me`                                                                              | 로그인 응답에 `company`가 없어 새로고침 뒤 역할·회사를 알 방법이 이것뿐이다. `proxy.ts`의 "역할별 첫 화면" TODO도 필요                                                                                                                             |
| `POST /chat/entries` (폼 입력)                                                         | AI 해석이 실패·시간 초과(2초)거나 `AI_BASE_URL`이 없으면 백엔드는 `form` 카드를 준다. 프론트 카드 종류에 `form`이 없어 그때는 기록할 방법이 없다. AI 장애 때나 AI를 설정하지 않은 시연 환경에서는 모든 메시지가 막힌다                             |
| `POST /count-requests/{id}/answer`, `PATCH /count-requests/{id}`, `GET /notifications` | 실사 흐름 전체가 안 맞는다(아래)                                                                                                                                                                                                                   |
| `POST /purchase-orders/{id}/mark-ordered`                                              | 주문 완료 표시 UI가 없다. 승인 후 24시간이 지난 발주는 전부 브리핑 `order_check_needed`와 `order_check` 알림에 잡힌다. 입고 때는 `implicit_order`로 처리돼 실제 납기 표본에서 빠지고, 공급사 LT50/LT90이 학습되지 않아 검토 품질이 조용히 떨어진다 |
| `GET /events` (SSE)                                                                    | 채팅 발주 요청 확정 응답은 `status: reviewing`이고 검토는 백그라운드에서 돈다. 프론트에 SSE도 `refetchInterval`도 없어 요청·검토함 화면이 새로고침 전까지 "검토중"에 멈춘다. 다른 사람이 기록한 재고 변화도 반영되지 않는다                        |
| `GET /categories`                                                                      | 프론트는 카테고리를 상수(`domain/part.ts`의 `CATEGORIES`)로 하드코딩한다. 백엔드는 회사별 카테고리와 `category_id`로 필터해서, 부품 목록 필터가 동작하지 않고 사용자가 추가한 카테고리가 보이지 않는다                                             |
| `GET /reviews/{id}/pdf`                                                                | `<a href={pdf_url}>`로는 Bearer 헤더를 붙일 수 없어 401이 난다. 토큰을 쿠키로 둘지 헤더로 보낼지 정할 때 같이 고려해야 한다                                                                                                                        |

실사 흐름이 안 맞는 부분:

- **요청이 담당자에게 안 간다.** 프론트는 실사 요청을 `/api/chat/inbox`로 받는데 백엔드에 그 경로가 없다. 백엔드는 알림(`count_request`)으로 보낸다.
- **장부 수량을 보여준다.** 프론트 실사 카드는 장부 수량(`ledger_qty`)을 보여주지만, 명세는 블라인드 실사(응답 전에는 장부 수량을 보여주지 않음)다. 백엔드는 채팅 `COUNT` 의도나 `answer`로 센 수량을 받은 뒤에야 차이를 알려 준다.
- **차이 사유를 보낼 길이 없다.** 프론트는 confirm에 `adjust_reason`을 실어 보내지만, 백엔드에서 사유는 `PATCH /count-requests/{id}`(`lost`, `missing_record`, `damaged`, `other`)로 따로 받는다. 사유가 안 가니 의심 항목이 `count_requested`에서 닫히지 않는다.

### 4-2. 당장 깨지지는 않는 것 (기능 공백)

| API                                                                                                                              | 상태                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `POST /reviews/{id}/recheck`                                                                                                     | "직접 수정 후 승인" UI가 아직 없다(`ApprovalActions.tsx` TODO). 만들 때 `approve_edited`가 `recheck_hash`를 요구한다 |
| `POST /reviews/{id}/clarify`                                                                                                     | 보류 건 보완 UI가 없다(`m/(tabs)/requests/page.tsx` TODO). 지금은 보류 건이 7일 뒤 만료로 끝난다                     |
| `POST /reviews/{id}/questions`                                                                                                   | 질문하기 UI 없음(TODO)                                                                                               |
| `GET·POST·DELETE /push/...`                                                                                                      | 웹 푸시 구독 없음                                                                                                    |
| `GET /dashboard/summary`, `GET /external/status`                                                                                 | 대시보드·외부 요인 값을 다른 API로 대신 계산하거나 목업에 의존                                                       |
| `GET·POST·PATCH·DELETE /calendar`                                                                                                | 연휴 캘린더 화면 없음                                                                                                |
| `GET /health`                                                                                                                    | 미사용                                                                                                               |
| `POST /movements/{id}/correction`                                                                                                | 원장 정정 UI 없음                                                                                                    |
| `POST·PATCH /parts`                                                                                                              | 부품 등록·수정 UI 없음                                                                                               |
| `GET /chat/messages`                                                                                                             | 채팅 이력 없음(새로고침하면 대화가 사라짐)                                                                           |
| `GET /purchase-orders/{id}`, `POST /purchase-orders/{id}/cancel`                                                                 | 발주 상세(`order_message`)·취소 없음                                                                                 |
| `GET·PATCH /suppliers/{id}`, `DELETE /suppliers/{id}/parts/{part_id}`, `PATCH /equipment/{id}`, `PATCH·DELETE /maintenance/{id}` | 상세·수정·삭제 없음                                                                                                  |

## 5. 정렬 순서 제안

1. **인증:** 토큰 보관 방식 결정, Bearer 헤더, `refresh`, `/me`, 가입·로그인·PIN·초대 응답 타입과 경로, 오류 코드 분기(`INVALID_PIN`, `PIN_LOCKED`, `INVITE_EXPIRED`)
2. **공통:** 커서 목록 `{ items, next_cursor }` 처리, 도메인 값 영문 코드 + 한글 표시 매핑(`domain/*`)
3. **채팅:** 메시지 응답·카드(`cards[]`, `entry_id`, `form` 카드), `entries/{id}/confirm·cancel`, 폼 입력 `POST /chat/entries`
4. **검토:** 목록·상세·결정 형식, SSE(`review.progress`, `review.decided`, `stock.changed`)
5. **실사:** 알림으로 요청 받기, 블라인드 실사, 차이 사유 `PATCH`
6. **발주:** 목록, 주문 완료 표시, 취소
7. **나머지 경로 이전:** 부품 상세·원장·예측선, 브리핑, 장부 검증, 병합, 기준 정보, 설정, 카테고리
8. **목업 갱신:** `packages/api/src/mocks/`를 명세 형식으로 맞춘다
