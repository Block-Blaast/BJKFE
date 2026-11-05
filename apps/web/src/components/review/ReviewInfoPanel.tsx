import { CHECKS, type CheckLevel } from '@bjk/api/domain/review';
import type { Review } from '@bjk/api/types/review';

import ComputedAt from '@/components/ui/ComputedAt';
import InfoPanel, { DotTag, InfoSection, MeterCard, PropertyList } from '@/components/ui/InfoPanel';
import Meter from '@/components/ui/Meter';
import { formatComputedAt, formatDate, formatQty, formatWon } from '@/utils/format';

import { entryLabelOf } from './labels';

const EMPTY = '—';

const LEVEL_DOT: Record<CheckLevel, 'danger' | 'warning' | 'neutral'> = {
  긴급: 'danger',
  경고: 'warning',
  정보: 'neutral',
};

// 검토 상세 정보 패널 (W-03). 절감 막대·미발주 위험·요청 속성·걸린 체크를 오른쪽에 모은다.
const ReviewInfoPanel = ({ review }: { review: Review }) => {
  const { original, proposal, risk_if_not_ordered: risk, part } = review;
  const saving = proposal.saving ?? 0;

  return (
    <InfoPanel title="정보">
      <div className="flex flex-col gap-3">
        <MeterCard
          label="수정안 절감"
          value={proposal.saving === null ? EMPTY : formatWon(saving)}
          note={
            original.total === null || proposal.total === null
              ? '금액을 비교할 단가 정보가 없어요'
              : `원안 ${formatWon(original.total)} → 수정안 ${formatWon(proposal.total)}`
          }
        >
          {original.total ? (
            <Meter label="원안 대비 절감 비율" ratio={saving / original.total} tone="brand" />
          ) : null}
        </MeterCard>
        <MeterCard
          label="발주하지 않으면"
          value={
            risk.loss
              ? formatWon(risk.loss)
              : risk.stockout_date
                ? `${formatDate(risk.stockout_date)} 소진`
                : '위험 없음'
          }
          note={
            risk.equipment.length > 0
              ? `멈추는 설비: ${risk.equipment.join(', ')}`
              : risk.loss === null
                ? '손실액 미등록 — 기준 정보의 설비에서 입력'
                : '멈추는 설비 없음'
          }
        />
      </div>

      <InfoSection title="요청">
        <PropertyList
          items={[
            { label: '상태', value: review.status },
            { label: '입구', value: entryLabelOf(review) },
            { label: '요청 시각', value: formatComputedAt(review.requested_at) },
            { label: '요청 수량', value: formatQty(original.qty, part.unit) },
            { label: '요청 공급사', value: original.supplier ?? EMPTY },
            {
              label: '요청 단가',
              value: original.unit_price === null ? EMPTY : formatWon(original.unit_price),
            },
          ]}
        />
        <ComputedAt at={review.computed_at} className="self-end" />
      </InfoSection>

      <InfoSection title="걸린 체크">
        {review.checks.length === 0 ? (
          <p className="text-body-sm text-text-secondary">걸린 체크가 없어요.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {review.checks.map((check) => (
              <DotTag key={check.code} tone={LEVEL_DOT[check.level]}>
                {check.level} · {CHECKS[check.code].name}
              </DotTag>
            ))}
          </ul>
        )}
      </InfoSection>
    </InfoPanel>
  );
};

export default ReviewInfoPanel;
