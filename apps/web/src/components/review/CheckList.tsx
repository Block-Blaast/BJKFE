import { Info, TriangleAlert, CircleAlert, type LucideIcon } from 'lucide-react';

import { CHECK_LEVEL_ORDER, CHECKS, type CheckLevel } from '@bjk/api/domain/review';
import type { ReviewCheck } from '@bjk/api/types/review';

import Tag, { type TagTone } from '@/components/ui/Tag';
import { factLabel, formatFact } from '@/utils/facts';

const LEVEL_TAG: Record<CheckLevel, { tone: TagTone; icon: LucideIcon }> = {
  긴급: { tone: 'danger', icon: TriangleAlert },
  경고: { tone: 'warning', icon: CircleAlert },
  정보: { tone: 'neutral', icon: Info },
};

type CheckListProps = {
  checks: ReviewCheck[];
  unit: string;
};

// 걸린 체크를 긴급 → 경고 → 정보 순으로, 근거 숫자와 함께 보여준다 (F-REVIEW-04, F-REVIEW-08)
const CheckList = ({ checks, unit }: CheckListProps) => {
  if (checks.length === 0) {
    return <p className="text-body-sm text-text-secondary">걸린 체크가 없어요.</p>;
  }

  const sorted = [...checks].sort(
    (a, b) => CHECK_LEVEL_ORDER[a.level] - CHECK_LEVEL_ORDER[b.level],
  );

  return (
    <ul className="flex flex-col gap-3">
      {sorted.map(({ code, level, facts }) => (
        <li key={code} className="flex flex-col gap-2 rounded-md border border-border-default p-4">
          <div className="flex items-center gap-2">
            <Tag {...LEVEL_TAG[level]}>{level}</Tag>
            <span className="text-label-md text-text-heading">{CHECKS[code].name}</span>
            <span className="text-label-sm text-text-secondary">{code}</span>
          </div>
          {Object.keys(facts).length > 0 ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(facts).map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-body-sm text-text-secondary">{factLabel(key, code)}</dt>
                  <dd className="text-right text-body-sm text-text-body tabular-nums">
                    {formatFact(key, value, unit)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </li>
      ))}
    </ul>
  );
};

export default CheckList;
