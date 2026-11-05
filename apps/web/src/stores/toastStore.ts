import { create } from 'zustand';

// 화면 아래가 아니라 위에서 잠깐 뜨는 알림. 서버 데이터가 아니라 "방금 무슨 일이 있었나"만 담는다.

export type ToastTone = 'in' | 'out' | 'info';

export type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  detail: string | null;
};

// 한꺼번에 기록이 몰려도 화면을 덮지 않게 최근 것만 남긴다
const MAX_TOASTS = 3;

type ToastState = {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
};

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }].slice(-MAX_TOASTS),
    })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
