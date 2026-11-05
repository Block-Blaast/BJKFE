import type { Part } from '@bjk/api/types/part';
import type { TwinBin, TwinLayout, TwinProjection } from '@bjk/api/types/twin';

// 패널 섹션이 받는 값. 서버 데이터는 이미 받아 둔 것을 넘긴다(섹션에서 같은 쿼리를 또 불러도 캐시라 괜찮다).
// 화면 조작(선택·강조·날짜)은 useWarehouseStore / useWarehouseBridge 로 직접 읽고 바꾼다.

type TwinContext = {
  layout: TwinLayout;
  projection: TwinProjection; // 지금 토글(발주 안 하면/하면)에 맞는 예측
  day: number;
  withOrders: boolean;
};

// 칸을 골랐을 때
export type BinSectionProps = TwinContext & {
  loc: string;
  part: Part;
  bin: TwinBin;
};

// 아무것도 고르지 않았을 때 (기본 패널)
export type OverviewSectionProps = TwinContext;
