import type { Metadata } from 'next';

import PagePlaceholder from '@/components/ui/PagePlaceholder';

export const metadata: Metadata = { title: '채팅' };

const ELEMENTS = [
  '메시지 입력 (음성은 폰 키보드 받아쓰기)',
  '빠른 문장 버튼: 출고, 입고, 몇 개 있어?',
  '확인 카드 4종: 확인 / 선택(후보 3개 + 목록에 없음) / 경고(5배 초과) / 미등록 (F-CHAT-02)',
  '확인 전 10분 만료, client_message_id 로 재전송 중복 방지',
  '조회 답변에 계산 기준 시각 (F-CHAT-03)',
  'LLM 오류 시 폼 입력 전환 (F-CHAT-01)',
  '실사 요청 메시지와 응답 (F-CHAT-05)',
];

const ChatPage = () => {
  return (
    <PagePlaceholder
      specId="M-02"
      title="채팅"
      description="작업자가 채팅 한 줄로 출고·입고·실사·조회·발주 요청을 기록해요."
      elements={ELEMENTS}
    />
  );
};

export default ChatPage;
