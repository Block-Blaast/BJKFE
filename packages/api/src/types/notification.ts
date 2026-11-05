// 알림 (F-NOTI-01·03·04 · BJK-AI-BE docs/api-spec/notifications.md NOT-01·02). 자기 알림만 온다.

export type NotificationKind =
  | 'review_completed'
  | 'review_urgent'
  | 'briefing'
  | 'decision_result'
  | 'order_check'
  | 'receipt_check'
  | 'count_request'
  | 'maintenance_check';

// chat 채널 알림은 작업자 채팅에 시스템 메시지로 보인다
export type NotificationChannel = 'push' | 'in_app' | 'chat';

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  target: { type: 'part' | 'review' | 'order' | 'count' | 'maintenance'; id: string } | null;
  title: string;
  channels: NotificationChannel[];
  read: boolean;
  sent_at: string; // 조용한 시간에 생긴 알림은 끝나는 시각으로 미뤄진다
};

export type NotificationList = {
  items: NotificationItem[];
  unread: number;
};

// 채팅에 시스템 말풍선으로 보일 알림 (예전 채팅 받은편지함 형식과 같다)
export type ChatSystemMessage = {
  id: string;
  text: string;
  created_at: string;
};
