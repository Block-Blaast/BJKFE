'use client';

import { MessageSquare, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import Button from '@bjk/ui/components/Button';

import ChatThread from '@/components/chat/ChatThread';

// 3D 창고(W-11) 위에서 채팅으로 바로 기록하는 서랍 — FLOATING_SLOTS 자리.
// 확인 카드를 누르면 ChatThread 가 twin.all 을 무효화해서 3D 수량이 따라 바뀐다.
// 서랍은 오버레이(absolute inset-0) 기준으로 오른쪽에 뜬다. 3D 를 함께 봐야 해서 모달이 아니다(포커스를 가두지 않음).
const ChatDrawer = () => {
  const [open, setOpen] = useState(false);
  // 한 번 연 뒤에는 닫아도 언마운트하지 않는다 — 대화와 확인 대기 카드가 사라지지 않게
  const [mounted, setMounted] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const toggleId = useId();
  const titleId = useId();
  const drawerId = useId();

  useEffect(() => {
    if (open) drawerRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [open]);

  const show = () => {
    setMounted(true);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    document.getElementById(toggleId)?.focus();
  };

  return (
    <>
      <Button
        id={toggleId}
        aria-expanded={open}
        aria-controls={drawerId}
        onClick={() => (open ? close() : show())}
        className="shadow-raised"
      >
        <MessageSquare size={16} aria-hidden />
        채팅으로 기록
      </Button>
      {mounted ? (
        <section
          ref={drawerRef}
          id={drawerId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              close();
            }
          }}
          className={`absolute inset-y-4 right-4 z-10 w-96 flex-col ${open ? 'flex' : 'hidden'} overflow-hidden rounded-xl bg-bg-page shadow-raised`}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 bg-bg-surface px-4 py-3">
            <h2 id={titleId} className="text-h3 text-text-heading">
              채팅 기록
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="채팅 닫기"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-body transition-colors hover:bg-bg-brand-subtle hover:text-text-brand"
            >
              <X size={16} aria-hidden />
            </button>
          </header>
          {/* ChatThread 는 폰 본문 여백(px-4 py-6)을 음수 마진으로 지우는 레이아웃이라 같은 여백을 여기서 준다 */}
          <div className="flex min-h-0 flex-1 flex-col px-4 py-6">
            <ChatThread />
          </div>
        </section>
      ) : null}
    </>
  );
};

export default ChatDrawer;
