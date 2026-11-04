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
