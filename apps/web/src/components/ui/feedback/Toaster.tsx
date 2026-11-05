'use client';

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleArrowDown,
  CircleArrowUp,
  Info,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

import IconCircle, { type IconCircleTone } from '@/components/ui/IconCircle';
import { useToastStore, type Toast, type ToastTone } from '@/stores/toastStore';

// 읽을 시간은 주되 3D 창고를 오래 가리지 않는 길이. 마우스를 올리면 멈춘다.
const SHOW_MS = 5000;

// 상태는 색 + 아이콘 + 글자로 함께 보여준다 (design-system 원칙 9). 글자는 title 에 있다.
// - 폰: 검정 알약 + 꽉 찬 원(IconCircle). 꽉 찬 상태색 토큰이 없어 입고는 파랑, 출고·안내는 흰 원으로 나눈다.
// - PC(lg~): 흰 카드 + 테두리 원 아이콘 + 아래 남은 시간 막대 (2026-11-06 요청 시안)
const TONE: Record<ToastTone, { icon: LucideIcon; circle: IconCircleTone; desk: LucideIcon }> = {
  in: { icon: ArrowDownToLine, circle: 'brand', desk: CircleArrowDown },
  out: { icon: ArrowUpFromLine, circle: 'onHero', desk: CircleArrowUp },
  info: { icon: Info, circle: 'onHero', desk: Info },
};

type ToastItemProps = {
  toast: Toast;
};

const ToastItem = ({ toast }: ToastItemProps) => {
  const dismiss = useToastStore((s) => s.dismiss);
  const bar = useRef<HTMLSpanElement>(null);
  const timing = useRef<Animation | null>(null);
  const { icon: Icon, circle, desk: DeskIcon } = TONE[toast.tone];

  // 남은 시간 막대가 줄어드는 애니메이션이 곧 타이머다 — 끝나면 닫고, 마우스를 올리면 함께 멈춘다.
  // 폰 폭에서는 막대를 투명하게만 둬서(display:none 이 아니라) 애니메이션이 그대로 돈다.
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
      className="pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-full bg-bg-inverse p-2 text-text-on-inverse shadow-raised lg:w-full lg:max-w-md lg:gap-4 lg:rounded-md lg:bg-bg-surface lg:py-5 lg:pr-4 lg:pl-6 lg:text-text-heading"
    >
      <span className="lg:hidden">
        <IconCircle icon={Icon} tone={circle} />
      </span>
      <DeskIcon size={28} aria-hidden className="hidden shrink-0 text-icon-brand lg:block" />
      <p className="flex flex-1 flex-col">
        <span className="text-label-md lg:text-body-lg">{toast.title}</span>
        {toast.detail ? (
          <span className="text-label-sm lg:text-body-sm lg:text-text-secondary">
            {toast.detail}
          </span>
        ) : null}
      </p>
      <button
        type="button"
        aria-label="알림 닫기"
        onClick={() => dismiss(toast.id)}
        className="flex size-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-bg-surface/10 lg:text-text-secondary lg:hover:bg-bg-subtle"
      >
        <X size={16} aria-hidden />
      </button>
      <span
        ref={bar}
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1 origin-left bg-bg-brand opacity-0 lg:opacity-100"
      />
    </li>
  );
};

// 루트 레이아웃에 한 번만 둔다. 위 가운데에 뜬다(폰은 아래에 탭 바가 있다).
// PC 는 3D 창고 위쪽 버튼 줄을 가리지 않게 그 아래(top-20)에 띄운다.
const Toaster = () => {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <ol
      aria-live="polite"
      aria-label="알림"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 lg:top-20 lg:gap-3"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ol>
  );
};

export default Toaster;
