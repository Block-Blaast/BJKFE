import { CATEGORIES, CATEGORY_DEFAULTS } from '@bjk/api/domain/part';

import { TABLE, TD, TH, TR } from '@/components/ui/table';

import SetupCard from './SetupCard';

// 카테고리 기본값 (F-SETUP-03). 부품에 카테고리를 정하면 수입 의존도와 연결 외부 요인이 함께 붙는다.
// TODO(F-SETUP-03): 부품별 예외(예: 국산 베어링) 수정 — 백엔드 계약이 정해지면 부품 상세에 붙인다.
const CategoryDefaults = () => (
  <SetupCard
    title="카테고리 기본값"
    description="부품이 수천 개여도 관리할 연결은 카테고리 수만큼이에요. 외부 요인은 납기 여유를 늘려 미리 대비하게 해요."
  >
    <table className={TABLE}>
      <thead>
        <tr>
          {['카테고리', '수입 의존', '연결 요인', 'HS 코드 (확장용)'].map((h) => (
            <th key={h} scope="col" className={`${TH} text-left`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {CATEGORIES.map((category) => {
          const d = CATEGORY_DEFAULTS[category];
          return (
            <tr key={category} className={TR}>
              <td className={`${TD} text-label-md text-text-heading`}>{category}</td>
              <td className={`${TD} text-text-body`}>{d.importDependency}</td>
              <td className={TD}>
                <span className="flex flex-wrap gap-2">
                  {d.factors.map((f) => (
                    <span
                      key={f}
                      className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-label-sm text-text-body"
                    >
                      {f}
                    </span>
                  ))}
                </span>
              </td>
              <td className={`${TD} text-text-secondary tabular-nums`}>{d.hsCode}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </SetupCard>
);

export default CategoryDefaults;
