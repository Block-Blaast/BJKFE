'use client';

import { useCategories } from '@/hooks/setup/useSetup';
import { TABLE, TD, TH, TR } from '@/components/ui/table';

import QueryStatus from './QueryStatus';
import SetupCard from './SetupCard';

// 카테고리 기본값 (F-SETUP-03, SET-06). 부품에 카테고리를 정하면 수입 의존도와 연결 외부 요인이 함께 붙는다.
// TODO(F-SETUP-03): 카테고리 등록·수정(POST·PATCH /categories), 부품별 예외(예: 국산 베어링) 화면은 아직 없다.
const CategoryDefaults = () => {
  const { data: categories, isPending, isError, refetch } = useCategories();

  return (
    <SetupCard
      title="카테고리 기본값"
      description="부품이 수천 개여도 관리할 연결은 카테고리 수만큼이에요. 외부 요인은 납기 여유를 늘려 미리 대비하게 해요."
    >
      <QueryStatus isPending={isPending} isError={isError} what="카테고리" onRetry={refetch} />
      {categories?.length === 0 ? (
        <p className="text-body-md text-text-secondary">아직 등록된 카테고리가 없어요.</p>
      ) : null}
      {categories && categories.length > 0 ? (
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
            {categories.map((category) => (
              <tr key={category.id} className={TR}>
                <td className={`${TD} text-label-md text-text-heading`}>{category.name}</td>
                <td className={`${TD} text-text-body`}>{category.import_dependency}</td>
                <td className={TD}>
                  <span className="flex flex-wrap gap-2">
                    {category.factors.map((f) => (
                      <span
                        key={f}
                        className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-label-sm text-text-body"
                      >
                        {f}
                      </span>
                    ))}
                  </span>
                </td>
                <td className={`${TD} text-text-secondary tabular-nums`}>
                  {category.hs_code ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </SetupCard>
  );
};

export default CategoryDefaults;
