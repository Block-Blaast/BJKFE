'use client';

import { CircleAlert, CircleCheck, CircleHelp, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { CATEGORY_DEFAULTS, DEMAND_PATTERNS } from '@bjk/api/domain/part';
import type { AbcClass, DemandPattern } from '@bjk/api/domain/part';
import type { Part } from '@bjk/api/types/part';

import ComputedAt from '@/components/ui/ComputedAt';
import HelpTip from '@/components/ui/HelpTip';
import Tag, { type TagTone } from '@/components/ui/Tag';
import { daysBetween, formatFullDate, formatNumber, formatQty, kstDay } from '@/utils/format';

const EMPTY = '—';

// 기간 필요량(D95·D99)을 보는 기간 = 입고 지연 시 기간(LT90) + 다음 검토까지 7일 (F-ANAL).
// 백엔드 계산과 같은 값인지 API 명세로 다시 확인할 것.
const REVIEW_PERIOD_DAYS = 7;

// 마감이 이 날 수 안으로 들어오면 "지금 발주"로 강조한다
const URGENT_DAYS = 7;

// 발주·필요 수량은 낱개로 주문하므로 소수점이 나오면 올려서 보여준다(모자라지 않게)
const orderQty = (value: number, unit: string) => formatQty(Math.ceil(value), unit);
// 월평균 사용량은 평균이라 소수 첫째 자리까지
const avgQty = (value: number, unit: string) => formatQty(Math.round(value * 10) / 10, unit);

const ABC_MEANING: Record<AbcClass, string> = {
  A: '핵심 부품',
  B: '중간 부품',
  C: '사용 금액이 적은 부품',
};

const PATTERN_MEANING: Record<DemandPattern, string> = {
  smooth: '출고가 자주 있고, 한 번에 쓰는 양도 비슷해요.',
  erratic: '출고는 자주 있지만, 한 번에 쓰는 양이 들쭉날쭉해요.',
  intermittent: '가끔씩만 출고되고, 쓸 때는 양이 비슷해요.',
  lumpy: '가끔씩만 출고되고, 쓸 때마다 양도 크게 달라요.',
  insufficient: '사용 기록이 적어 아직 판단하기 어려워요.',
};

type Decision = { tone: TagTone; icon: LucideIcon; label: string };

const decide = (R: number | null, deadlineDays: number | null): Decision => {
  if (R === null) return { tone: 'neutral', icon: CircleHelp, label: '판단 정보 부족' };
  if (R <= 0) return { tone: 'success', icon: CircleCheck, label: '지금은 발주 불필요' };
  if (deadlineDays !== null && deadlineDays < 0)
    return { tone: 'danger', icon: CircleAlert, label: '발주 마감일 지남' };
  if (deadlineDays !== null && deadlineDays <= URGENT_DAYS)
    return { tone: 'danger', icon: CircleAlert, label: '지금 발주 필요' };
  return { tone: 'warning', icon: TriangleAlert, label: '발주 필요' };
};

const relativeDays = (days: number | null) => {
  if (days === null) return null;
  if (days === 0) return '분석일 당일';
  return days > 0 ? `분석일로부터 ${days}일 후` : `분석일보다 ${-days}일 지남`;
};

const KeyFigure = ({
  label,
  value,
  note,
  noteDanger = false,
}: {
  label: string;
  value: ReactNode;
  note?: string | null;
  noteDanger?: boolean;
}) => (
  <div className="flex flex-col gap-2 rounded-md bg-bg-page p-4">
    <span className="text-label-sm text-text-secondary">{label}</span>
    <span className="text-h3 text-text-heading tabular-nums">{value}</span>
    {note ? (
      <span
        className={`text-body-sm tabular-nums ${noteDanger ? 'text-text-danger' : 'text-text-secondary'}`}
      >
        {note}
      </span>
    ) : null}
  </div>
);

const Metric = ({
  label,
  help,
  children,
}: {
  label: string;
  help: ReactNode;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <dt className="flex items-center gap-1 text-label-sm text-text-secondary">
      {label}
      <HelpTip label={label}>{help}</HelpTip>
    </dt>
    <dd className="text-body-md text-text-heading tabular-nums">{children}</dd>
  </div>
);

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-3">
    <h3 className="text-label-lg text-text-heading">{title}</h3>
    <dl className="grid grid-cols-3 gap-x-6 gap-y-4">{children}</dl>
  </div>
);

const Card = ({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-5 rounded-xl bg-bg-surface p-6 shadow-card">
    <div className="flex items-start justify-between gap-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-h3 text-text-heading">{title}</h2>
        {description ? <p className="text-body-sm text-text-secondary">{description}</p> : null}
      </div>
      {aside}
    </div>
    {children}
  </section>
);

type PartMetricsProps = {
  part: Part;
};

// 부품 상세(W-05)의 근거 지표 (F-ANAL). 위 카드에 발주 여부·수량·시점과 그 이유를,
// 아래 카드에 그 판단에 쓴 통계 지표(ABC·수요 유형·D95/D99·LT50/LT90)를 쉬운 이름과 (?) 설명으로 보여준다.
// 백엔드 필드명(m, D95, reorder_point …)은 그대로 쓰고 표시 이름만 바꿨다.
const PartMetrics = ({ part }: PartMetricsProps) => {
  const { metrics, unit } = part;
  const { m, D95, D99, reorder_point, R, LT50, LT90, t_out, t_deadline } = metrics;

  const baseDay = metrics.computed_at ? kstDay(metrics.computed_at) : null;
  const outDays = baseDay && t_out ? daysBetween(baseDay, t_out) : null;
  const deadlineDays = baseDay && t_deadline ? daysBetween(baseDay, t_deadline) : null;
  const decision = decide(R, deadlineDays);
  const available = part.stock + (part.incoming?.qty ?? 0);
  const period = LT90 !== null ? LT90 + REVIEW_PERIOD_DAYS : null;
  // 마감일 = 소진일 − LT90 으로 계산된 값인지 확인하고, 맞을 때만 그 관계를 문장으로 설명한다
  const deadlineFromLeadTime =
    t_out && t_deadline && LT90 !== null && daysBetween(t_deadline, t_out) === LT90;
  const factors = part.category ? CATEGORY_DEFAULTS[part.category]?.factors : undefined;

  const reasons: string[] = [];
  reasons.push(
    `현재 재고는 ${formatQty(part.stock, unit)}${
      part.incoming
        ? `, 입고 예정 ${formatQty(part.incoming.qty, unit)}을 더하면 ${formatQty(available, unit)}`
        : ''
    }이에요.`,
  );
  if (reorder_point !== null) {
    const rp = Math.ceil(reorder_point);
    reasons.push(
      available > rp
        ? `발주 검토 기준 재고(${formatQty(rp, unit)})보다 ${formatQty(available - rp, unit)} 많아요.`
        : `발주 검토 기준 재고(${formatQty(rp, unit)})와 같거나 적어요. 입고가 늦어지면 모자랄 수 있어요.`,
    );
  }
  if (m !== null) reasons.push(`한 달에 평균 ${avgQty(m, unit)}씩 써요.`);
  if (t_out) {
    reasons.push(
      deadlineFromLeadTime && t_deadline
        ? `이대로 쓰면 ${formatFullDate(t_out)}쯤 재고가 바닥나요. 입고가 늦어질 때 ${LT90}일이 걸리니, 그보다 ${LT90}일 앞선 ${formatFullDate(t_deadline)}까지는 발주해야 해요.`
        : `이대로 쓰면 ${formatFullDate(t_out)}쯤 재고가 바닥나요.`,
    );
  }
  if (part.risk === '주의' || part.risk === '높음') {
    reasons.push(`외부 위험 신호가 '${part.risk}'이에요. 평소보다 입고가 늦어질 수 있어요.`);
  }

  return (
    <>
      <Card
        title="발주 판단"
        aside={
          <div className="flex shrink-0 items-center gap-2">
            {metrics.estimated ? (
              <Tag tone="warning" icon={CircleHelp}>
                추정치 기반
              </Tag>
            ) : null}
            {metrics.computed_at ? <ComputedAt at={metrics.computed_at} full /> : null}
          </div>
        }
      >
        <div className="grid grid-cols-4 gap-3">
          <KeyFigure
            label="현재 발주 필요 여부"
            value={
              <Tag tone={decision.tone} icon={decision.icon}>
                {decision.label}
              </Tag>
            }
          />
          <KeyFigure
            label="권장 발주 수량"
            value={R === null ? EMPTY : orderQty(R, unit)}
            note={
              R === 0 && reorder_point !== null && available > reorder_point
                ? '재고가 기준보다 많아 지금은 필요 없어요'
                : null
            }
          />
          <KeyFigure
            label="늦어도 발주해야 하는 날짜"
            value={t_deadline ? formatFullDate(t_deadline) : EMPTY}
            note={relativeDays(deadlineDays)}
            noteDanger={deadlineDays !== null && deadlineDays < 0}
          />
          <KeyFigure
            label="예상 재고 소진일"
            value={t_out ? formatFullDate(t_out) : EMPTY}
            note={relativeDays(outDays)}
            noteDanger={outDays !== null && outDays < 0}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-label-lg text-text-heading">발주 판단 근거</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-body-md text-text-body">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {metrics.estimated ? (
            <p className="text-body-sm text-text-secondary">
              사용 기록이 쌓이기 전이라 월 사용 추정치와 정비 일정으로 계산했어요.
            </p>
          ) : null}
        </div>
      </Card>

      <Card
        title="상세 분석"
        description="위 판단에 쓴 숫자예요. (?)를 누르면 뜻과 계산 기준을 볼 수 있어요."
      >
        <Group title="부품 특성">
          <Metric
            label="재고 중요도"
            help={
              <>
                <span>1년 동안 이 부품에 쓰는 금액(월평균 사용량 × 12 × 단가)으로 나눠요.</span>
                <span>
                  A: 금액 순으로 쌓아 전체의 80%를 차지하는 핵심 부품 — 떨어지지 않게 가장 꼼꼼히
                  봐요.
                </span>
                <span>B: 그다음 15%를 차지하는 중간 부품.</span>
                <span>C: 나머지 5% — 사용 금액이 적은 부품.</span>
              </>
            }
          >
            {metrics.abc ? `${metrics.abc} · ${ABC_MEANING[metrics.abc]}` : EMPTY}
          </Metric>
          <Metric
            label="재고 사용 패턴"
            help={
              <>
                <span>
                  최근 출고 기록을 보고 얼마나 자주 나가는지(출고 간격)와 한 번에 나가는 양이 얼마나
                  비슷한지(수량 변동)로 나눠요.
                </span>
                {metrics.demand_pattern ? (
                  <span>
                    {DEMAND_PATTERNS[metrics.demand_pattern]}:{' '}
                    {PATTERN_MEANING[metrics.demand_pattern]}
                  </span>
                ) : null}
                <span>규칙적일수록 예상 필요 수량이 정확해요.</span>
              </>
            }
          >
            {metrics.demand_pattern ? DEMAND_PATTERNS[metrics.demand_pattern] : EMPTY}
          </Metric>
          <Metric
            label="외부 위험 신호"
            help={
              <>
                <span>
                  {factors?.length
                    ? `이 부품 분류(${part.category})는 ${factors.join('·')}을(를) 봐요.`
                    : '부품 분류에 따라 환율·해상운임·명절 같은 바깥 상황을 봐요.'}
                </span>
                <span>매일 새벽 각 지표가 최근 평소 수준에서 얼마나 벗어났는지 계산해요.</span>
                <span>
                  정상: 평소 범위 · 주의: 평소보다 꽤 벗어남 · 높음: 크게 벗어남. 주의 이상이면
                  입고가 늦어지거나 값이 오를 수 있어요.
                </span>
              </>
            }
          >
            {part.risk ?? EMPTY}
          </Metric>
        </Group>

        <Group title="사용량과 필요 수량">
          <Metric
            label="월평균 사용량"
            help={<span>최근 출고 기록으로 계산한 한 달 평균 사용량이에요.</span>}
          >
            {m === null ? EMPTY : avgQty(m, unit)}
          </Metric>
          <Metric
            label="예상 필요 수량 (95% 기준)"
            help={
              <>
                <span>
                  {period !== null
                    ? `앞으로 ${period}일(입고 지연 시 기간 ${LT90}일 + 다음 검토까지 ${REVIEW_PERIOD_DAYS}일) 동안 쓸 것으로 보는 수량이에요.`
                    : '입고가 늦어질 때 기간과 다음 검토까지 쓸 것으로 보는 수량이에요.'}
                </span>
                <span>
                  95%: 같은 상황이 100번 오면 95번은 이 수량 안에서 충분하다는 뜻이에요. 소수점은
                  올려서 보여줘요.
                </span>
              </>
            }
          >
            {D95 === null ? EMPTY : orderQty(D95, unit)}
          </Metric>
          <Metric
            label="예상 필요 수량 (99% 기준)"
            help={
              <>
                <span>
                  95% 기준과 같은 기간{period !== null ? `(${period}일)` : ''}을 더 넉넉하게 본
                  수량이에요.
                </span>
                <span>
                  99%: 100번 중 99번은 이 수량 안에서 충분해요. 핵심 부품처럼 떨어지면 안 되는
                  경우에 참고해요.
                </span>
              </>
            }
          >
            {D99 === null ? EMPTY : orderQty(D99, unit)}
          </Metric>
          <Metric
            label="발주 검토 기준 재고"
            help={
              <>
                <span>재고가 이 수량 이하로 내려가면 발주를 검토해야 해요.</span>
                <span>
                  입고가 늦어지는 동안 버틸 수 있는 수량이라, 이보다 적으면 입고 전에 재고가 바닥날
                  수 있어요.
                </span>
              </>
            }
          >
            {reorder_point === null ? EMPTY : orderQty(reorder_point, unit)}
          </Metric>
          <Metric
            label="권장 발주 수량"
            help={
              <>
                <span>지금 발주한다면 주문할 수량이에요. 소수점은 올려서 낱개로 보여줘요.</span>
                <span>
                  현재 재고(입고 예정 포함)가 발주 검토 기준 재고보다 많으면 0개 — 지금은 발주가
                  필요 없어요.
                </span>
              </>
            }
          >
            {R === null ? EMPTY : orderQty(R, unit)}
          </Metric>
        </Group>

        <Group title="입고 기간">
          <Metric
            label="일반적인 입고 소요 기간"
            help={
              <span>
                발주부터 입고까지 걸린 날 수를 모아 가운데 값으로 정해요. 절반은 이보다 빨리, 절반은
                이보다 늦게 들어와요.
              </span>
            }
          >
            {LT50 === null ? EMPTY : `${formatNumber(LT50)}일`}
          </Metric>
          <Metric
            label="입고 지연 시 소요 기간"
            help={
              <>
                <span>같은 기록에서 10번 중 9번은 이 기간 안에 들어왔어요.</span>
                <span>
                  발주 마감일과 예상 필요 수량은 입고가 이만큼 늦어져도 버티도록 이 기간으로
                  계산해요.
                </span>
              </>
            }
          >
            {LT90 === null ? EMPTY : `${formatNumber(LT90)}일`}
          </Metric>
        </Group>
      </Card>
    </>
  );
};

export default PartMetrics;
