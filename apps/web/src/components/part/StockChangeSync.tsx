'use client';

import { useStockChangeSync } from '@/hooks/part/useStockChanged';

// 다른 탭에서 확정한 입출고를 이 탭에도 토스트·지게차로 보여준다. 그리는 것은 없다.
const StockChangeSync = () => {
  useStockChangeSync();
  return null;
};

export default StockChangeSync;
