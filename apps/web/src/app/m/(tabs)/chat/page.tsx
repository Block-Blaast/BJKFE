import type { Metadata } from 'next';

import ChatThread from '@/components/chat/ChatThread';

export const metadata: Metadata = { title: '채팅' };

const ChatPage = () => {
  return <ChatThread />;
};

export default ChatPage;
