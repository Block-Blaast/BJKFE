import { ApiError } from '@bjk/api/client';

// 서버가 보낸 사유(body.message)를 먼저 쓰고, 없을 때만 fallback 으로 내려간다.
export const apiErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    const body = error.body as { message?: string } | undefined;
    if (body?.message) return body.message;
  }
  return fallback;
};

export const apiErrorStatus = (error: unknown) => (error instanceof ApiError ? error.status : null);

// 검토 결정 실패 안내 (F-APPROVAL-02). 409 도 사유가 여럿이다 — 이미 결정됨, 근거가 바뀜(SNAPSHOT_REFRESHED),
// 결정할 수 없음(REVIEW_NOT_DECIDABLE). 그래서 서버 사유를 먼저 보여 준다.
// 실패해도 useDecideReview 가 검토를 다시 받으므로 화면은 최신 결과로 바뀐다.
export const decisionErrorMessage = (error: unknown) =>
  apiErrorMessage(
    error,
    apiErrorStatus(error) === 409
      ? '다른 사람이 먼저 처리했어요. 화면이 최신 결과로 바뀌어요.'
      : '처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
  );
