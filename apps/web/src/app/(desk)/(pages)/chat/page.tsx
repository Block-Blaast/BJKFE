import type { Metadata } from 'next';

import ChatThread from '@/components/chat/ChatThread';

export const metadata: Metadata = { title: '채팅 기록' };

// 3D 창고 메뉴에서 여는 채팅 (M-02 를 PC 에서). 폰 화면과 같은 ChatThread 를 쓴다.
// ChatThread 는 폰 본문 여백(px-4 py-6)을 음수 마진으로 지우는 레이아웃이라 같은 여백을 카드 안에 준다.
const DeskChatPage = () => {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-heading">채팅 기록</h1>
        <p className="text-body-md text-text-secondary">
          &quot;V벨트 2개 씀&quot;처럼 한 줄로 쓰면 AI가 읽고 확인 카드를 띄워요. 확인을 누르면
          기록돼요.
        </p>
      </header>
      <div className="flex h-160 max-w-2xl flex-col rounded-xl bg-bg-surface px-4 py-6 shadow-card">
        <ChatThread />
      </div>
    </div>
  );
};

export default DeskChatPage;
