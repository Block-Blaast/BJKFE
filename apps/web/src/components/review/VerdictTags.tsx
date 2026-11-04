import {
  CircleAlert,
  CircleCheck,
  CirclePause,
  PencilLine,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

import type { ReviewFlag, Verdict } from '@bjk/api/domain/review';

import Tag, { type TagTone } from '@/components/ui/Tag';

const VERDICT_TAG: Record<Verdict, { tone: TagTone; icon: LucideIcon }> = {
  적정: { tone: 'success', icon: CircleCheck },
  '수정 권고': { tone: 'brand', icon: PencilLine },
  보류: { tone: 'warning', icon: CirclePause },
};

const FLAG_TAG: Record<ReviewFlag, { tone: TagTone; icon: LucideIcon }> = {
  긴급: { tone: 'danger', icon: TriangleAlert },
  주의: { tone: 'warning', icon: CircleAlert },
};

type VerdictTagsProps = {
  verdict: Verdict;
  flags: ReviewFlag[];
};

// 판정(수정안이 원안과 다른가)과 표시(얼마나 서둘러야 하나)는 따로 매긴다 (F-REVIEW-06)
const VerdictTags = ({ verdict, flags }: VerdictTagsProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tag {...VERDICT_TAG[verdict]}>{verdict}</Tag>
      {flags.map((flag) => (
        <Tag key={flag} {...FLAG_TAG[flag]}>
          {flag}
        </Tag>
      ))}
    </div>
  );
};

export default VerdictTags;
