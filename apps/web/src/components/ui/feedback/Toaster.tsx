'use client';

import { CircleArrowDown, CircleArrowUp, Info, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { useToastStore, type Toast, type ToastTone } from '@/stores/toastStore';

// 읽을 시간은 주되 3D 창고를 오래 가리지 않는 길이. 마우스를 올리면 멈춘다.
const SHOW_MS = 5000;

// 상태는 색 + 아이콘 + 글자로 함께 보여준다 (design-system 원칙 9). 글자는 title 에 있다.
// 흰 카드 + 테두리 원 아이콘 + 아래 남은 시간 막대 (2026-11-06 요청 시안)
const TONE_ICON: Record<ToastTone, LucideIcon> = {
  in: CircleArrowDown,
  out: CircleArrowUp,
  info: Info,
};

type ToastItemProps = {
  toast: Toast;
};

const ToastItem = ({ toast }: ToastItemProps) => {
  const dismiss = useToastStore((s) => s.dismiss);
  const bar = useRef<HTMLSpanElement>(null);
  const timing = useRef<Animation | null>(null);
  const Icon = TONE_ICON[toast.tone];

  // 남은 시간 막대가 줄어드는 애니메이션이 곧 타이머다 — 끝나면 닫고, 마우스를 올리면 함께 멈춘다.
  useEffect(() => {
    const el = bar.current;
    if (!el?.animate) {
      const timer = window.setTimeout(() => dismiss(toast.id), SHOW_MS);
      return () => window.clearTimeout(timer);
    }
    const animation = el.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
      duration: SHOW_MS,
      easing: 'linear',
      fill: 'forwards',
    });
    timing.current = animation;
    animation.onfinish = () => dismiss(toast.id);
    // 다른 탭을 보는 동안 온 알림(다른 탭·SSE)은 돌아왔을 때부터 5초를 센다.
    // 숨은 탭에서는 시간이 멈췄다가 돌아오는 순간 한꺼번에 흘러 바로 닫혀 버린다
    const onVisibility = () => (document.hidden ? animation.pause() : animation.play());
    if (document.hidden) animation.pause();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      animation.cancel();
    };
  }, [dismiss, toast.id]);

  return (
    <li
      onMouseEnter={() => timing.current?.pause()}
      onMouseLeave={() => timing.current?.play()}
      className="pointer-events-auto relative flex w-full max-w-md items-center gap-4 overflow-hidden rounded-md bg-bg-surface py-5 pr-4 pl-6 text-text-heading shadow-raised"
    >
      <Icon size={28} aria-hidden className="shrink-0 text-icon-brand" />
      <p className="flex flex-1 flex-col">
        <span className="text-body-lg">{toast.title}</span>
        {toast.detail ? (
          <span className="text-body-sm text-text-secondary">{toast.detail}</span>
        ) : null}
      </p>
      <button
        type="button"
        aria-label="알림 닫기"
        onClick={() => dismiss(toast.id)}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-subtle"
      >
        <X size={16} aria-hidden />
      </button>
      <span
        ref={bar}
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1 origin-left bg-bg-brand"
      />
    </li>
  );
};

// 루트 레이아웃에 한 번만 둔다. PC 에서만 왼쪽에 붙여 띄운다 — 3D 창고 왼쪽 위 메뉴 버튼 아래(top-24).
// 폰 화면(lg 미만)은 작업자가 직접 기록하는 곳이라 토스트를 띄우지 않는다(2026-11-06 결정).
// 숨긴 동안에도 남은 시간은 흘러 쌓이지 않고 닫힌다.
const Toaster = () => {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <ol
      aria-live="polite"
      aria-label="알림"
      className="pointer-events-none fixed top-24 left-4 z-50 hidden w-full max-w-md flex-col items-start gap-3 lg:flex"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ol>
  );
};

export default Toaster;
