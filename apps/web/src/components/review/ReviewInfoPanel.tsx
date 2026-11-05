import type { RiskLevel } from '@bjk/api/domain/part';
import { CHECKS, type CheckLevel } from '@bjk/api/domain/review';
import type { Review, ReviewExternal } from '@bjk/api/types/review';

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

const RISK_DOT: Record<RiskLevel, 'danger' | 'warning' | 'neutral'> = {
  높음: 'danger',
  주의: 'warning',
  정상: 'neutral',
};

const riskValue = ({ level, r }: { level: RiskLevel; r: number }) => (
  <DotTag as="span" tone={RISK_DOT[level]}>
    {level} · 위험도 {r.toFixed(2)}
  </DotTag>
);

// 외부 요인이 이 검토에 어떻게 쓰였는지 한 줄로 (F-EXT-02, C-09)
const externalNote = (external: ReviewExternal) => {
  if (!external.import_dependent) return '국내 조달 부품이라 환율·해상운임을 반영하지 않아요.';
  if (external.applied) return '위험이 높아 외부 리스크(C-09)로 판정과 의견서에 반영했어요.';
  return '수입 의존 부품이에요. 지금은 위험이 낮아 판정에 영향이 없어요.';
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

      {review.external ? (
        <InfoSection title="외부 요인">
          <p className="text-body-sm text-text-secondary">{externalNote(review.external)}</p>
          <PropertyList
            items={[
              { label: '해상운임 (납기)', value: riskValue(review.external.lead) },
              { label: '환율 (단가)', value: riskValue(review.external.price) },
              {
                label: '납기 구간 연휴',
                value: review.external.holidays.length ? review.external.holidays.join(', ') : '없음',
              },
            ]}
          />
        </InfoSection>
      ) : null}

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
