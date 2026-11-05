import type { Part } from '@bjk/api/types/part';
import type { TwinBin, TwinLayout, TwinProjection } from '@bjk/api/types/twin';

// 패널 섹션이 받는 값. 서버 데이터는 이미 받아 둔 것을 넘긴다(섹션에서 같은 쿼리를 또 불러도 캐시라 괜찮다).
// 화면 조작(선택·강조)은 useWarehouseStore / useWarehouseBridge 로 직접 읽고 바꾼다.

type TwinContext = {
  layout: TwinLayout;
  projection: TwinProjection; // 오늘 상태 (발주 전 예측, with_orders=false)
};

// 칸을 골랐을 때
export type BinSectionProps = TwinContext & {
  loc: string;
  part: Part;
  bin: TwinBin;
};

// 아무것도 고르지 않았을 때 (기본 패널)
export type OverviewSectionProps = TwinContext;
