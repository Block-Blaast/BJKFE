'use client';

import Button from '@bjk/ui/components/Button';

import { useToastStore } from '@/stores/toastStore';

// 실제 토스트는 SSE stock.changed 를 받아야 뜬다. 연결 전에 모양을 확인하려고 같은 저장소에 예시를 넣는다.
const ToastPreview = () => {
  const push = useToastStore((s) => s.push);

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        onClick={() =>
          push({ tone: 'in', title: '볼베어링 6205ZZ 3개 입고', detail: '지금 재고 6개' })
        }
      >
        입고 토스트
      </Button>
      <Button
        variant="secondary"
        onClick={() => push({ tone: 'out', title: 'V벨트 A-42 2개 출고', detail: '지금 재고 1개' })}
      >
        출고 토스트
      </Button>
    </div>
  );
};

export default ToastPreview;
