'use client';

import { useWarehouseStore } from '@/stores/warehouseStore';
import { BIN_LOOK_LABEL, TWIN_LAYERS, type BinLook, type TwinLayerKey } from '@/utils/twin';

// 색 견본은 3D 씬의 재질 색을 그대로 옮긴 장식이라 프리미티브를 쓴다. 의미는 옆의 글씨가 전한다
const LOOK_SWATCH: Record<BinLook, string> = {
  out: 'bg-red-700',
  risk: 'bg-red-500',
  suspect: 'bg-gray-900',
  low: 'bg-orange-500',
  normal: 'bg-gray-300',
};

const LAYER_SWATCH: Record<TwinLayerKey, string> = {
  status: 'bg-orange-500',
  hidden: 'ring-2 ring-inset ring-brand-500',
  suspect: 'bg-gray-900',
  impact: 'bg-red-500',
  dock: 'bg-sub-300',
};

const LOOKS: BinLook[] = ['out', 'risk', 'suspect', 'low', 'normal'];

// 왼쪽 아래 범례 + 층 켜고 끄기 (켜지면 검정 알약, aria-pressed)
const WarehouseLegend = () => {
  const layers = useWarehouseStore((s) => s.layers);
  const toggleLayer = useWarehouseStore((s) => s.toggleLayer);

  return (
    <div className="flex w-fit flex-col gap-3 rounded-xl bg-bg-surface p-4 shadow-card">
      <ul aria-label="칸 색" className="flex flex-wrap gap-x-4 gap-y-2">
        {LOOKS.map((look) => (
          <li key={look} className="flex items-center gap-2 text-label-sm text-text-body">
            <span aria-hidden className={`size-3 rounded-full ${LOOK_SWATCH[look]}`} />
            {BIN_LOOK_LABEL[look]}
          </li>
        ))}
      </ul>
      <div role="group" aria-label="표시 층" className="flex flex-wrap gap-2">
        {TWIN_LAYERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={layers[key]}
            onClick={() => toggleLayer(key)}
            className={`flex h-9 items-center gap-2 rounded-full px-3 text-label-sm transition-colors ${
              layers[key]
                ? 'bg-bg-inverse text-text-on-inverse'
                : 'bg-bg-subtle text-text-secondary hover:bg-bg-page'
            }`}
          >
            <span aria-hidden className={`size-3 rounded-full ${LAYER_SWATCH[key]}`} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WarehouseLegend;
