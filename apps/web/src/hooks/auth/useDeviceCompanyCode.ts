import { useSyncExternalStore } from 'react';

// 초대 수락 때 기기에 저장하는 회사 코드 (F-AUTH-02). 다음부터는 이름 선택 + PIN 으로 들어온다.
// 저장소가 막힌 환경(사생활 보호 모드 등)에서는 저장이 안 될 수 있어 모든 접근을 try/catch 로 감싼다.
const KEY = 'bjk.companyCode';
const listeners = new Set<() => void>();

const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const saveDeviceCompanyCode = (code: string) => {
  try {
    localStorage.setItem(KEY, code);
  } catch {
    // 저장 실패 — 다음 접속 때 다시 초대 QR 이 필요하다
  }
  listeners.forEach((listener) => listener());
};

export const useDeviceCompanyCode = () => useSyncExternalStore(subscribe, read, () => null);
