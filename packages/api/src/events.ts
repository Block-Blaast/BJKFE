import { requestStream } from './client';
import { ENDPOINTS } from './endpoints';
import type { ServerEvent } from './types/events';

// 실시간 이벤트 (NOT-03, SSE) 연결.
// 백엔드는 Authorization 헤더로 인증해 브라우저 기본 EventSource(헤더를 못 붙임)를 못 쓴다 — fetch 로 읽는다.
// 서버는 5분마다 연결을 닫는다. retry(기본 3초) 뒤 Last-Event-ID 를 붙여 다시 붙으면 빠진 이벤트부터 받는다.

const DEFAULT_RETRY_MS = 3000;
// 401(토큰 갱신도 실패)이나 서버 오류가 이어지면 너무 자주 두드리지 않게 늦춘다
const MAX_RETRY_MS = 60_000;

const KNOWN = new Set<ServerEvent['type']>([
  'stock.changed',
  'review.created',
  'review.progress',
  'review.decided',
  'audit.flagged',
]);

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });

type Frame = { id: string | null; event: string; data: string; retry: number | null };

// 빈 줄로 끝나는 한 덩어리를 읽는다. ':' 로 시작하는 줄(keepalive)은 무시한다
const parseFrame = (block: string): Frame => {
  const frame: Frame = { id: null, event: 'message', data: '', retry: null };
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue;
    const at = line.indexOf(':');
    const field = at < 0 ? line : line.slice(0, at);
    const value = at < 0 ? '' : line.slice(at + 1).replace(/^ /, '');
    if (field === 'id') frame.id = value;
    else if (field === 'event') frame.event = value;
    else if (field === 'data') data.push(value);
    else if (field === 'retry' && /^\d+$/.test(value)) frame.retry = Number(value);
  }
  frame.data = data.join('\n');
  return frame;
};

const toEvent = (frame: Frame): ServerEvent | null => {
  if (!frame.data || !KNOWN.has(frame.event as ServerEvent['type'])) return null;
  try {
    return { type: frame.event, data: JSON.parse(frame.data) } as ServerEvent;
  } catch {
    return null;
  }
};

// signal 을 끊을 때까지 이벤트를 받는다. 끊기면 알아서 다시 붙는다.
export const listenServerEvents = async (
  onEvent: (event: ServerEvent) => void,
  signal: AbortSignal,
) => {
  let lastId: string | null = null;
  let retryMs = DEFAULT_RETRY_MS;
  let failures = 0;

  while (!signal.aborted) {
    try {
      const res = await requestStream(ENDPOINTS.events, {
        signal,
        headers: { Accept: 'text/event-stream', ...(lastId ? { 'Last-Event-ID': lastId } : {}) },
      });
      if (!res.ok || !res.body) throw new Error(`events ${res.status}`);
      failures = 0;
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() ?? '';
        for (const block of blocks) {
          const frame = parseFrame(block);
          if (frame.retry !== null) retryMs = frame.retry;
          if (frame.id !== null) lastId = frame.id;
          const event = toEvent(frame);
          if (event) onEvent(event);
        }
      }
    } catch {
      if (signal.aborted) return;
      failures += 1;
    }
    await sleep(Math.min(MAX_RETRY_MS, retryMs * 2 ** failures), signal);
  }
};
