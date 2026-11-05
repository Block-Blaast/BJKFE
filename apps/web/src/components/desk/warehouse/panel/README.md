# 3D 창고(W-11) 오버레이에 기능 꽂기

`/warehouse` 는 `public/warehouse-3d.html`(iframe) 위에 React 오버레이(`../WarehouseView.tsx`)를 겹친 화면입니다.
기능을 붙일 때 `WarehouseView`·`WarehousePanel`·`TwinPanel` 을 고치지 말고, **파일 하나를 만들고 `slots.ts` 에 두 줄(import 한 줄 + 배열 항목 한 줄)만 추가**합니다. 여러 에이전트가 동시에 붙이므로 남의 줄은 건드리지 않습니다.

## 자리

| 배열 (`slots.ts`)   | 언제 보이나                                | props                  | 예                                                                      |
| ------------------- | ------------------------------------------ | ---------------------- | ----------------------------------------------------------------------- |
| `PANEL_TOP_SLOTS`   | 오른쪽 패널 맨 위 (항상)                   | 없음                   | `WarehouseSearch`                                                       |
| `BIN_SECTIONS`      | 칸을 골랐을 때, 기본 정보 아래             | `BinSectionProps`      | `ReviewSection`, `ArrivalSection`, `AuditSection`, `HiddenStockSection` |
| `OVERVIEW_SECTIONS` | 아무것도 안 골랐을 때, 주의할 칸 목록 아래 | `OverviewSectionProps` | 전체 입고 예정 목록 등                                                  |
| `FLOATING_SLOTS`    | 화면 오른쪽 아래                           | 없음                   | `ChatDrawer` 의 플로팅 버튼                                             |

- 섹션 파일: `panel/<이름>Section.tsx` 하나. 검색·채팅처럼 섹션이 아닌 것은 `components/desk/warehouse/<이름>.tsx`.
- 섹션은 `InfoSection`(`@/components/ui/InfoPanel`)으로 감싸 패널 안 다른 섹션과 모양을 맞춥니다. 섹션이 보여줄 것이 없으면 `null` 을 돌려줍니다.
- `FLOATING_SLOTS` 자리는 이미 `pointer-events-auto` 입니다. 열리는 서랍은 `absolute` 로 띄우면 오버레이 전체(iframe 위 `inset-0`) 기준으로 잡힙니다.
- 디자인 규칙(`.claude/rules/design-system.md`)을 그대로 지킵니다.

## 데이터와 조작

- 서버 데이터: props(`layout`, `projection`, `part`, `bin`). 숫자는 오늘 값(`TODAY`, `@/utils/twin`)를 쓰거나 `useTwinLayout`/`useTwinProjection`/`useParts` 를 직접 불러도 됩니다(같은 캐시).
- 화면 상태: `useWarehouseStore`(`@/stores/warehouseStore`) — 선택 칸, 강조 칸, 층, 패널 열림, 보기.
- 3D 조작: `useWarehouseBridge()`(`@/hooks/twin/useWarehouseBridge`). iframe 을 직접 만지지 않습니다.

```tsx
'use client';

import { InfoSection } from '@/components/ui/InfoPanel';
import { useWarehouseBridge } from '@/hooks/twin/useWarehouseBridge';

import type { BinSectionProps } from './types';

const ReviewSection = ({ loc, part, bin }: BinSectionProps) => {
  const bridge = useWarehouseBridge();
  return (
    <InfoSection title="검토">
      <button type="button" onClick={() => bridge.goTo(loc)}>
        {part.name}
      </button>
    </InfoSection>
  );
};

export default ReviewSection;
```

```ts
// slots.ts
import ReviewSection from './ReviewSection';
export const BIN_SECTIONS: ComponentType<BinSectionProps>[] = [ReviewSection];
```

### 브릿지 명령

| 명령                          | 하는 일                                                           |
| ----------------------------- | ----------------------------------------------------------------- |
| `select(loc \| null)`         | 칸 선택(패널이 열림). store 를 바꾸면 씬이 따라간다               |
| `highlight(locs, label?)`     | 여러 칸 강조. `label` 은 패널 제목으로 쓰인다. `[]` 로 해제       |
| `setLayers({ hidden: true })` | 층 일부만 바꿔도 된다                                             |
| `flyTo(target)`               | 카메라: `'home'` · `'top'` · `{ locs }` · `{ equipmentId }`       |
| `goTo(loc)`                   | 선택 + 그 칸으로 날아감                                           |
| `focus(locs, label)`          | 강조 + 날아감 + 패널 열기 (칩·검색 결과)                          |
| `reset()`                     | 선택·강조 지우고 `'home'`                                         |
| `ready`                       | iframe 이 `ready` 를 보냈는지. 전에 부른 명령은 ready 때 반영된다 |

칸 id(`loc`)는 `` `${rack_id}-${level}-${slot}` `` 입니다. `twinLoc(placement)`, `locsByPart(layout.placements)`(`@/utils/twin`)로 만듭니다.
