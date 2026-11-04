'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { FlaskConical } from 'lucide-react';
import dynamic from 'next/dynamic';

import type { StockForecast } from '@bjk/api/types/forecast';
import Button from '@bjk/ui/components/Button';

import ComputedAt from '@/components/ui/ComputedAt';
import Tag from '@/components/ui/Tag';

// 차트 라이브러리는 PC 화면(W-03, W-05)에서만 쓰므로 이 화면을 열 때 따로 불러온다.
const StockForecastChart = dynamic(() => import('./StockForecastChart'), {
  ssr: false,
  loading: () => <div className="h-72 rounded-md bg-bg-subtle" aria-hidden />,
});

type ForecastPanelProps = {
  query: UseQueryResult<StockForecast>;
};

// 재고 추이 + 예측선 카드. 데이터 상태(로딩·에러)와 계산 기준 시각을 함께 다룬다.
const ForecastPanel = ({ query }: ForecastPanelProps) => {
  const { data: forecast, isPending, isError, refetch } = query;

  return (
    <section className="flex flex-col gap-3 rounded-md bg-bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-label-lg text-text-heading">재고 추이와 예측</h2>
        <div className="flex items-center gap-2">
          {forecast?.is_mock ? (
            <Tag tone="neutral" icon={FlaskConical}>
              목업 예측
            </Tag>
          ) : null}
          {forecast?.computed_at ? <ComputedAt at={forecast.computed_at} /> : null}
        </div>
      </div>
      {isPending ? (
        <div className="h-72 rounded-md bg-bg-subtle" aria-label="그래프를 불러오는 중" />
      ) : isError ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-body-md text-text-danger">그래프 데이터를 불러오지 못했어요.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            다시 시도
          </Button>
        </div>
      ) : (
        <StockForecastChart forecast={forecast} />
      )}
    </section>
  );
};

export default ForecastPanel;
