'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import ForkliftMark from '@/components/illustration/ForkliftMark';
import PendingReviewBadge from '@/components/layout/PendingReviewBadge';
import { DESK_MENU } from '@/constants/routes';
import { useReviews } from '@/hooks/review/useReviews';

// 3D 창고 왼쪽 위 메뉴 (v3) — 상단 메뉴 대신 여기서 기존 화면(W-01~10)을 상세 페이지로 연다.
// 3D 를 가리지 않게 평소에는 버튼 하나이고, 누르면 목록이 펼쳐진다. Esc·바깥 클릭으로 닫는다.
const WarehouseMenu = () => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pending = useReviews({ status: 'pending' });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="warehouse-menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-2 rounded-full bg-bg-surface py-1 pr-4 pl-1 text-label-md text-text-heading shadow-card transition-colors hover:bg-bg-subtle"
      >
        <ForkliftMark className="size-8" />
        발주콕
        {open ? <X size={16} aria-hidden /> : <Menu size={16} aria-hidden />}
      </button>

      {open ? (
        <nav
          id="warehouse-menu"
          aria-label="화면 메뉴"
          className="absolute top-12 left-0 z-10 flex w-64 flex-col gap-4 rounded-xl bg-bg-surface p-4 shadow-card"
        >
          {DESK_MENU.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <p className="px-2 text-label-sm text-text-secondary">{group.title}</p>
              <ul className="flex flex-col">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex h-10 items-center justify-between gap-2 rounded-md px-2 text-label-md text-text-body transition-colors hover:bg-bg-subtle hover:text-text-heading"
                    >
                      {item.label}
                      {item.href === '/reviews' ? (
                        <PendingReviewBadge count={pending.data?.length ?? null} />
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      ) : null}
    </div>
  );
};

export default WarehouseMenu;
