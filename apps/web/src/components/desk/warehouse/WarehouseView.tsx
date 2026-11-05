'use client';

import { Layers, Map as MapIcon, PanelRightClose, PanelRightOpen, Scan } from 'lucide-react';
import { useEffect, useState } from 'react';

import Button from '@bjk/ui/components/Button';

import ErrorState from '@/components/ui/ErrorState';
import { useParts } from '@/hooks/part/useParts';
import { useTwinLayout, useTwinProjection } from '@/hooks/twin/useTwinLayout';
import {
  pushWarehouseData,
  registerWarehouseFrame,
  useWarehouseBridge,
} from '@/hooks/twin/useWarehouseBridge';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { locsByPart } from '@/utils/twin';

import { FLOATING_SLOTS } from './panel/slots';
import WarehouseMenu from './WarehouseMenu';
import WarehousePanel from './WarehousePanel';
import WarehouseSkeleton from './WarehouseSkeleton';
import WarehouseSummary from './WarehouseSummary';
import WarehouseTable, { WarehouseViewToggle } from './WarehouseTable';

const FLOAT = 'pointer-events-auto';
const PANEL_ID = 'warehouse-panel';

// 디지털 트윈 — 3D 창고 (W-11). 3D 는 public/warehouse-3d.html(iframe)이 그리고,
// 이 컴포넌트는 그 위에 겹치는 React 레이어다. 씬은 useWarehouseBridge 로만 조작한다.
// 색·숫자는 모두 /twin/projection 의 오늘 값에서 온다 — 여기서 계산하지 않는다.
// 오버레이 바깥 래퍼는 pointer-events-none 이라 빈 곳을 끌면 iframe 이 카메라를 돌린다.
const WarehouseView = () => {
  const view = useWarehouseStore((s) => s.view);
  const panelOpen = useWarehouseStore((s) => s.panelOpen);
  const setPanelOpen = useWarehouseStore((s) => s.setPanelOpen);
  const bridge = useWarehouseBridge();

  const layout = useTwinLayout();
  // 3D 는 오늘 상태(발주 전)를 그린다. 결정 대기(수정안 상자)는 "발주하면" 예측에만 실려 칩을 셀 때만 쓴다
  const projection = useTwinProjection(false);
  const ordered = useTwinProjection(true);
  const parts = useParts({});

  useEffect(() => {
    if (layout.data && projection.data) {
      pushWarehouseData({
        layout: layout.data,
        projection: projection.data,
        // 백엔드 part_id 는 UUID 라 이름·카테고리로 물품 모양과 라벨을 정한다
        parts: parts.data?.map((p) => ({ id: p.id, name: p.name, category: p.category })),
      });
    }
  }, [layout.data, projection.data, parts.data]);

  const failed = layout.isError || projection.isError || parts.isError;
  const [errorClosed, setErrorClosed] = useState(false);
  const ready = layout.data && projection.data && parts.data;

  return (
    <div className="relative flex-1 overflow-hidden bg-bg-surface">
      {/* 표 보기 중에도 언마운트하지 않는다 — 다시 로드하면 three.js 씬을 처음부터 만든다 */}
      <iframe
        ref={registerWarehouseFrame}
        src="/warehouse-3d.html"
        title="3D 창고"
        aria-hidden={view === 'table'}
        className={`absolute inset-0 size-full border-0 ${view === 'table' ? 'invisible' : ''}`}
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className={`${FLOAT} flex flex-col gap-2`}>
            <div className="flex flex-wrap items-start gap-2">
              <WarehouseMenu />
              {layout.data && projection.data ? (
                <WarehouseSummary
                  layout={layout.data}
                  projection={projection.data}
                  withOrdersProjection={ordered.data}
                />
              ) : null}
            </div>
            {projection.data?.is_mock ? (
              <span className="w-fit rounded-full bg-bg-surface px-3 py-1 text-label-sm text-text-secondary shadow-card">
                목업 데이터
              </span>
            ) : null}
          </div>
          <div className={`${FLOAT} flex shrink-0 items-center gap-2`}>
            {view === '3d' ? (
              <>
                {layout.data && projection.data ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      // 원본 3D 의 "숨은 재고 찾기" — 이름이 달라도 같은 규격인 칸(same_spec_group)을 모두 비춘다
                      const locsOf = locsByPart(layout.data.placements);
                      bridge.focus(
                        projection.data.bins
                          .filter((b) => b.same_spec_group)
                          .flatMap((b) => locsOf.get(b.part_id) ?? []),
                        '숨은 재고',
                      );
                    }}
                  >
                    <Layers size={16} aria-hidden />
                    숨은 재고 찾기
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={bridge.reset}>
                  <Scan size={16} aria-hidden />
                  전체 보기
                </Button>
                <Button variant="secondary" onClick={() => bridge.flyTo('top')}>
                  <MapIcon size={16} aria-hidden />
                  위에서 보기
                </Button>
              </>
            ) : null}
            {ready ? (
              // 패널 여닫기는 다른 버튼과 같은 줄·같은 모양으로 둔다 — 열림·닫힘 어느 쪽이든 같은 자리에 있다
              <Button
                variant="secondary"
                aria-expanded={panelOpen}
                aria-controls={PANEL_ID}
                onClick={() => setPanelOpen(!panelOpen)}
              >
                {panelOpen ? (
                  <PanelRightClose size={16} aria-hidden />
                ) : (
                  <PanelRightOpen size={16} aria-hidden />
                )}
                {panelOpen ? '패널 닫기' : '패널 열기'}
              </Button>
            ) : null}
            <WarehouseViewToggle />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex min-w-0 flex-1 flex-col justify-end">
            {failed && errorClosed ? null : failed ? (
              <div className={`${FLOAT} m-auto w-full max-w-md`}>
                <ErrorState
                  title="창고 정보를 불러오지 못했어요"
                  onClose={() => setErrorClosed(true)}
                  onRetry={() => {
                    setErrorClosed(false);
                    void layout.refetch();
                    void projection.refetch();
                    void parts.refetch();
                  }}
                />
              </div>
            ) : !ready ? (
              <WarehouseSkeleton />
            ) : view === 'table' ? (
              <div className={`${FLOAT} min-h-0 flex-1 overflow-y-auto`}>
                <WarehouseTable />
              </div>
            ) : null}
          </div>

          {ready && panelOpen ? (
            // 스크롤 영역 자체를 둥글게 잘라, 긴 패널이 화면 아래에서 직각으로 잘려 보이지 않게 한다
            <div
              id={PANEL_ID}
              aria-live="polite"
              className={`${FLOAT} flex w-96 shrink-0 scrollbar-thin flex-col gap-4 overflow-y-auto overscroll-contain rounded-xl`}
            >
              <WarehousePanel
                layout={layout.data}
                projection={projection.data}
                parts={parts.data}
              />
            </div>
          ) : null}
        </div>

        {FLOATING_SLOTS.length ? (
          <div className={`${FLOAT} flex shrink-0 items-center gap-2 self-end`}>
            {FLOATING_SLOTS.map((Slot, i) => (
              <Slot key={i} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default WarehouseView;
