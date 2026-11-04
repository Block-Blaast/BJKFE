const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 응답 래퍼 형식은 백엔드가 정해지면 여기서 벗긴다. 지금은 JSON 바디를 그대로 돌려준다.
export const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  const body: unknown = res.status === 204 ? undefined : await res.json().catch(() => undefined);

  if (!res.ok) {
    throw new ApiError(res.status, res.statusText || `HTTP ${res.status}`, body);
  }
  return body as T;
};
