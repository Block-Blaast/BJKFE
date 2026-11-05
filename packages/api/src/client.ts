// 모든 요청은 같은 출처의 /api 로 보낸다. 운영은 Caddy, 로컬 개발은 next.config.ts rewrites 가 백엔드로 넘긴다.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

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

// ---- 로그인 토큰 (백엔드 docs/api-spec/common.md: Bearer, 액세스 15분·리프레시 14일) ----
// 기기(localStorage)에 둔다. TODO(auth): httpOnly 쿠키로 옮길지 백엔드와 정한다.
// 서버 렌더링 중이거나 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 토큰 없이 요청한다.
export type StoredTokens = { access_token: string; refresh_token: string };

const TOKEN_KEY = 'bjk.auth';
const REFRESH_PATH = '/v1/auth/refresh';

const readTokens = (): StoredTokens | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
};

export const setAuthTokens = (tokens: StoredTokens | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (tokens) {
      window.localStorage.setItem(
        TOKEN_KEY,
        JSON.stringify({ access_token: tokens.access_token, refresh_token: tokens.refresh_token }),
      );
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // 저장하지 못해도 이번 요청은 진행한다 — 다음 요청이 401 이면 다시 로그인하게 된다
  }
};

// 액세스 토큰이 만료되면(401) 리프레시 토큰으로 한 번만 새로 받는다. 동시에 여러 요청이 401 을 받아도 갱신은 한 번이다.
let refreshing: Promise<boolean> | null = null;

const refreshTokens = () => {
  refreshing ??= (async () => {
    const tokens = readTokens();
    if (!tokens?.refresh_token) return false;
    try {
      const res = await fetch(`${BASE_URL}${REFRESH_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: tokens.refresh_token }),
      });
      if (!res.ok) {
        setAuthTokens(null);
        return false;
      }
      setAuthTokens((await res.json()) as StoredTokens);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
};

const send = (path: string, init: RequestInit | undefined) => {
  // 파일 업로드(FormData)는 브라우저가 boundary 를 붙인 Content-Type 을 직접 정해야 한다
  const isForm = init?.body instanceof FormData;
  const access = readTokens()?.access_token;
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...init?.headers,
    },
  });
};

const sendWithRefresh = async (path: string, init: RequestInit | undefined) => {
  const res = await send(path, init);
  if (res.status === 401 && path !== REFRESH_PATH && (await refreshTokens())) {
    return send(path, init);
  }
  return res;
};

// 파일(결재용 PDF 등)을 받는다. 로그인 토큰이 필요해 링크로 바로 열지 못하고 이렇게 받아 연다
export const requestBlob = async (path: string): Promise<Blob> => {
  const res = await sendWithRefresh(path, undefined);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => undefined);
    throw new ApiError(res.status, res.statusText || `HTTP ${res.status}`, body);
  }
  return res.blob();
};

// 응답 래퍼 형식은 백엔드가 정해지면 여기서 벗긴다. 지금은 JSON 바디를 그대로 돌려준다.
export const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await sendWithRefresh(path, init);

  const body: unknown = res.status === 204 ? undefined : await res.json().catch(() => undefined);

  if (!res.ok) {
    throw new ApiError(res.status, res.statusText || `HTTP ${res.status}`, body);
  }
  return body as T;
};
