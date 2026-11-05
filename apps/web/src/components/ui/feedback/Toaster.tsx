'use client';

import { ArrowDownToLine, ArrowUpFromLine, Info, X, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';

import IconCircle, { type IconCircleTone } from '@/components/ui/IconCircle';
import { useToastStore, type Toast, type ToastTone } from '@/stores/toastStore';

// 읽을 시간은 주되 3D 창고를 오래 가리지 않는 길이. 마우스를 올려도 멈추지 않으니 닫기 버튼을 함께 둔다.
const SHOW_MS = 5000;

// 상태는 색 + 아이콘 + 글자로 함께 보여준다 (design-system 원칙 9). 글자는 title 에 있다.
// 검정 알약 위라 꽉 찬 원(IconCircle)만 쓴다 — 꽉 찬 상태색 토큰이 없어 입고는 파랑, 출고·안내는 흰 원으로 나눈다.
const TONE: Record<ToastTone, { icon: LucideIcon; circle: IconCircleTone }> = {
  in: { icon: ArrowDownToLine, circle: 'brand' },
  out: { icon: ArrowUpFromLine, circle: 'onHero' },
  info: { icon: Info, circle: 'onHero' },
};

type ToastItemProps = {
  toast: Toast;
};

const ToastItem = ({ toast }: ToastItemProps) => {
  const dismiss = useToastStore((s) => s.dismiss);
  const { icon: Icon, circle } = TONE[toast.tone];

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast.id]);

  return (
    <li className="pointer-events-auto flex items-center gap-3 rounded-full bg-bg-inverse p-2 text-text-on-inverse shadow-raised">
      <IconCircle icon={Icon} tone={circle} />
      <p className="flex flex-col">
        <span className="text-label-md">{toast.title}</span>
        {toast.detail ? <span className="text-label-sm">{toast.detail}</span> : null}
      </p>
      <button
        type="button"
        aria-label="알림 닫기"
        onClick={() => dismiss(toast.id)}
        className="flex size-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-bg-surface/10"
      >
        <X size={16} aria-hidden />
      </button>
    </li>
  );
};

// 루트 레이아웃에 한 번만 둔다. 폰·PC 화면 모두 위 가운데에 뜬다(폰은 아래에 탭 바가 있다).
const Toaster = () => {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <ol
      aria-live="polite"
      aria-label="알림"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ol>
  );
};

export default Toaster;
