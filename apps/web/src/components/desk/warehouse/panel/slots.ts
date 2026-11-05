import type { ComponentType } from 'react';

import ChatDrawer from '@/components/desk/warehouse/ChatDrawer';
import WarehouseSearch from '@/components/desk/warehouse/WarehouseSearch';

import ArrivalSection, { ArrivalOverviewSection } from './ArrivalSection';
import AuditSection, { AuditOverviewSection } from './AuditSection';
import HiddenStockSection, { HiddenStockOverview } from './HiddenStockSection';
import ReviewSection, { ReviewOverviewSection } from './ReviewSection';
import type { BinSectionProps, OverviewSectionProps } from './types';

// 3D 창고(W-11) 오버레이에 기능을 꽂는 곳. 규약은 같은 폴더의 README.md.
// 여러 에이전트가 동시에 붙이므로 기능 하나당 import 한 줄 + 배열 항목 한 줄만 추가한다.
// 순서는 배열 순서대로 그린다. 남의 줄은 고치지 않는다.

// 패널 맨 위 (검색: WarehouseSearch)
export const PANEL_TOP_SLOTS: ComponentType[] = [WarehouseSearch];

// 칸을 골랐을 때, 기본 정보 아래 (ReviewSection, ArrivalSection, AuditSection, HiddenStockSection …)
export const BIN_SECTIONS: ComponentType<BinSectionProps>[] = [
  ReviewSection,
  ArrivalSection,
  AuditSection,
  HiddenStockSection,
];

// 아무것도 고르지 않았을 때, 주의할 칸 목록 아래
export const OVERVIEW_SECTIONS: ComponentType<OverviewSectionProps>[] = [
  ReviewOverviewSection,
  ArrivalOverviewSection,
  AuditOverviewSection,
  HiddenStockOverview,
];

// 화면 오른쪽 아래, 날짜 슬라이더 옆 (채팅: ChatDrawer 의 버튼). 열리는 서랍은 absolute 로 띄우면 오버레이 전체 기준이다
export const FLOATING_SLOTS: ComponentType[] = [ChatDrawer];
