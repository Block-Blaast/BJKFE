'use client';

import { RotateCw } from 'lucide-react';

import Button from '@bjk/ui/components/Button';

import SpotlightIllustration from '@/components/illustration/SpotlightIllustration';

type ErrorStateProps = {
  title: string; // "부품을 불러오지 못했어요"
  onRetry: () => void;
  // card: 화면의 본문 자리를 채우는 카드 / inline: 카드 안의 작은 자리(목록 일부, 그래프 칸)
  size?: 'card' | 'inline';
};

const HINT = '인터넷 연결을 확인하고 다시 시도해 주세요.';

// 불러오기 실패 — 빛이 빈자리를 비추는 일러스트 + 다시 시도. EmptyState 와 짝이다.
const ErrorState = ({ title, onRetry, size = 'card' }: ErrorStateProps) => {
  const retry = (
    <Button variant="secondary" onClick={onRetry}>
      <RotateCw size={16} aria-hidden />
      다시 시도
    </Button>
  );

  if (size === 'inline') {
    return (
      <div role="alert" className="flex items-center gap-4 rounded-md bg-bg-sub-subtle p-4">
        <SpotlightIllustration variant="lost" className="h-16 w-auto shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-label-lg text-text-heading">{title}</p>
          <p className="text-body-sm text-text-secondary">{HINT}</p>
        </div>
        {retry}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl bg-bg-surface px-6 py-12 text-center shadow-card"
    >
      <SpotlightIllustration variant="lost" className="h-24 w-auto" />
      <p className="text-h3 text-text-heading">{title}</p>
      <p className="text-body-md text-text-secondary">{HINT}</p>
      <div className="pt-2">{retry}</div>
    </div>
  );
};

export default ErrorState;
