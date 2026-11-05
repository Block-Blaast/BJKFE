import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { ChatSystemMessage, NotificationItem, NotificationList } from './types/notification';

type Page = NotificationList & { next_cursor: string | null };

// 커서 목록을 끝까지 받는다(sent_at 최신 순). unread 는 첫 페이지 값이 전체 기준이다
export const getNotifications = async (): Promise<NotificationList> => {
  const items: NotificationItem[] = [];
  let unread = 0;
  let cursor: string | null = null;
  do {
    const search = new URLSearchParams({ limit: '100' });
    if (cursor) search.set('cursor', cursor);
    const page: Page = await request<Page>(`${ENDPOINTS.notifications}?${search.toString()}`);
    if (!cursor) unread = page.unread;
    items.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return { items, unread };
};

// 이미 읽은 알림은 처음 읽은 시각을 유지한다(다시 불러도 된다)
export const markNotificationRead = (id: string) =>
  request<NotificationItem>(ENDPOINTS.notificationRead(id), { method: 'POST' });

// 작업자 채팅의 시스템 메시지(실사 요청 등) — chat 채널 알림만 골라 채팅 말풍선 형식으로 바꾼다
export const getChatNotifications = async (): Promise<ChatSystemMessage[]> => {
  const { items } = await getNotifications();
  return items
    .filter((n) => n.channels.includes('chat'))
    .map((n) => ({ id: n.id, text: n.title, created_at: n.sent_at }));
};

export const notificationQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.notifications.list(),
      queryFn: getNotifications,
    }),
};
