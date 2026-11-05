'use client';

import {
  ArrowRight,
  Boxes,
  CircleAlert,
  ClipboardCheck,
  Coins,
  Inbox,
  Info,
  Package,
  PackageCheck,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { AuditGrade } from '@bjk/api/domain/audit';

import { entryLabelOf } from '@/components/review/labels';
import VerdictTags from '@/components/review/VerdictTags';
import ComputedAt from '@/components/ui/ComputedAt';
import IconCircle, { type IconCircleTone } from '@/components/ui/IconCircle';
import Tag, { type TagTone } from '@/components/ui/Tag';
import { useAudits } from '@/hooks/audit/useAudits';
import { useTodayActivity } from '@/hooks/activity/useTodayActivity';
import { useDashboardSummary } from '@/hooks/dashboard/useDashboardSummary';
import { useReviews } from '@/hooks/review/useReviews';
import { formatComputedAt, formatDate, formatWon } from '@/utils/format';
import { TABLE, TD, TH, TR } from '@/components/ui/table';

const EMPTY = '—';
const TOP = 5;

const Card = ({
  title,
  href,
  aside,
  children,
}: {
  title: string;
  href?: string;
  aside?: ReactNode;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-4 rounded-xl bg-bg-surface p-6 shadow-card">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-h3 text-text-heading">{title}</h2>
      <div className="flex items-center gap-3">
        {aside}
        {href ? (
          <Link
            href={href}
            className="flex h-9 items-center gap-1 rounded-full bg-bg-subtle px-4 text-label-sm text-text-body transition-colors hover:bg-bg-brand-subtle hover:text-text-brand"
          >
            전체 보기
            <ArrowRight size={14} aria-hidden />
          </Link>
        ) : null}
      </div>
    </div>
    {children}
  </section>
);

const Muted = ({ children }: { children: ReactNode }) => (
  <p className="text-body-sm text-text-secondary">{children}</p>
);

// 큰 단독 숫자에는 tabular-nums 를 쓰지 않는다 (dataviz)
const Stat = ({
  label,
  value,
  note,
  icon,
  hero = false,
  tone = 'brand',
}: {
  label: string;
  value: string;
  note?: string;
  icon: LucideIcon;
  hero?: boolean;
  tone?: IconCircleTone;
}) => (
  <div
    className={`flex flex-1 flex-col gap-3 rounded-xl p-6 ${
      hero
        ? 'bg-bg-brand bg-linear-to-br from-brand-600 via-brand-500 to-brand-300 text-text-on-brand shadow-raised print:text-text-heading'
        : 'bg-bg-surface text-text-heading shadow-card'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <span className={`text-label-md ${hero ? '' : 'text-text-secondary'}`}>{label}</span>
      <IconCircle icon={icon} tone={hero ? 'onHero' : tone} />
    </div>
    <span className="text-display">{value}</span>
    {note ? (
      <span
        className={`w-fit rounded-full px-3 py-1 text-label-sm ${hero ? 'bg-bg-surface text-text-brand' : 'bg-bg-subtle text-text-body'}`}
      >
        {note}
      </span>
    ) : (
      // 카드 높이를 맞추려고 같은 높이의 빈 줄을 둔다
      <span className="h-6" aria-hidden />
    )}
  </div>
);

const percent = new Intl.NumberFormat('ko-KR', { style: 'percent', maximumFractionDigits: 0 });

const GRADE_TAG: Record<AuditGrade, { tone: TagTone; icon: LucideIcon }> = {
  높음: { tone: 'danger', icon: TriangleAlert },
  중간: { tone: 'warning', icon: CircleAlert },
  낮음: { tone: 'neutral', icon: Info },
};

const EXTERNAL_FACTORS = [
  { name: '해상운임', effect: '수입 부품 납기에 여유를 더해요' },
  { name: '명절·춘절 캘린더', effect: '납기 구간에 겹친 연휴만큼 납기를 늘려요' },
  { name: '환율', effect: '수입 부품에 단가 상승 위험을 표시해요' },
];

const ROW = 'border-t border-border-default first:border-t-0';

// 대시보드 (W-01). 숫자 카드·결품 위험·오늘 기록은 대시보드 요약(DSH-02) 하나로 받는다 — 우선순위·묶인 재고 금액은 서버가 계산한다.
// 목록 카드(검토·의심 항목)는 다른 화면과 같은 쿼리를 써서, 승인·실사·기록이 생기면 함께 갱신된다.
// 카드마다 따로 불러와서 하나가 실패해도 나머지는 보인다.
// 왼쪽(결품 위험·오늘 기록)과 오른쪽(검토·의심·외부 요인)을 독립 열로 쌓아, 카드 높이가 달라도 빈틈이 생기지 않게 한다.
// TODO(W-01): SSE(stock.changed, review.created, review.decided, audit.flagged)로 실시간 갱신
const Dashboard = () => {
  const summary = useDashboardSummary();
  const activity = useTodayActivity();
  const reviews = useReviews({ status: 'pending' });
  const audits = useAudits({ status: 'active' });

  const s = summary.data;
  const computedAt = s?.computed_at;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1 text-text-heading">오늘의 발주 현황</h1>
          <p className="text-body-md text-text-secondary">
            결품 위험, 결정할 검토, 확인할 재고를 한눈에 봐요.
          </p>
        </div>
        {computedAt ? (
          <span className="flex h-11 items-center gap-2 rounded-full bg-bg-surface px-5 text-label-sm text-text-secondary shadow-card">
            지표 <ComputedAt at={computedAt} />
          </span>
        ) : null}
      </header>

      <div className="flex gap-5">
        <Stat
          hero
          icon={Inbox}
          label="결정 대기 검토"
          value={s ? `${s.pending_reviews.count}건` : EMPTY}
          note={s?.pending_reviews.urgent ? `긴급 ${s.pending_reviews.urgent}건` : undefined}
        />
        <Stat
          icon={ClipboardCheck}
          tone="inverse"
          label="확인할 재고"
          value={s ? `${s.audit_flags.open}건` : EMPTY}
          note={s?.audit_flags.high ? `높음 ${s.audit_flags.high}건` : undefined}
        />
        <Stat
          icon={PackageCheck}
          tone="gradient"
          label="주문 대기 발주"
          value={s ? `${s.awaiting_order}건` : EMPTY}
          note={s ? '승인 후 주문 표시 전' : undefined}
        />
        <Stat
          icon={Coins}
          label="묶인 재고 금액"
          value={s ? formatWon(s.tied_up_stock_amount) : EMPTY}
          note={s ? '180일 동안 안 나간 재고' : undefined}
        />
      </div>

      <div className="grid grid-cols-5 items-start gap-5">
        <div className="col-span-3 flex flex-col gap-5">
          <Card title="결품 위험 상위 5" href="/parts">
            {summary.isPending ? (
              <Muted>불러오는 중이에요…</Muted>
            ) : summary.isError ? (
              <Muted>결품 위험을 불러오지 못했어요.</Muted>
            ) : summary.data.risk_top5.length === 0 ? (
              <Muted>결품 위험을 계산한 부품이 아직 없어요.</Muted>
            ) : (
              <table className={`${TABLE} tabular-nums`}>
                <thead>
                  <tr>
                    <th scope="col" className={`${TH} text-left`}>
                      부품
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      결품 확률
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      예상 손실
                    </th>
                    <th scope="col" className={`${TH} text-right`}>
                      소진 예상
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.data.risk_top5.map((r) => (
                    <tr key={r.part_id} className={TR}>
                      <td className={TD}>
                        <Link
                          href={`/parts/${r.part_id}`}
                          className="flex items-center gap-3 text-label-md text-text-heading hover:text-text-brand"
                        >
                          <span className="flex size-9 items-center justify-center rounded-full bg-bg-subtle text-text-secondary">
                            <Boxes size={16} aria-hidden />
                          </span>
                          {r.name}
                        </Link>
                      </td>
                      <td className={`${TD} text-right text-text-body`}>
                        {percent.format(r.p_out)}
                      </td>
                      <td className={`${TD} text-right text-text-body`}>{formatWon(r.loss)}</td>
                      <td className={`${TD} text-right text-text-heading`}>
                        {r.t_out ? formatDate(r.t_out) : EMPTY}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* 건수는 대시보드 요약, 항목별 흐름은 오늘 활동(GET /v1/activity/today, 백엔드 PR 278 머지 후)에서 온다 */}
          <Card title="오늘 기록">
            {summary.isPending ? (
              <Muted>불러오는 중이에요…</Muted>
            ) : summary.isError ? (
              <Muted>오늘 기록을 불러오지 못했어요.</Muted>
            ) : (
              <dl className="grid grid-cols-3 gap-3">
                {(
                  [
                    ['입출고 기록', summary.data.today.movements, Package],
                    ['새 검토', summary.data.today.reviews_created, Inbox],
                    ['결정', summary.data.today.decisions, ClipboardCheck],
                  ] as const
                ).map(([label, count, Icon]) => (
                  <div key={label} className="flex items-center gap-3 rounded-md bg-bg-page p-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-secondary">
                      <Icon size={16} aria-hidden />
                    </span>
                    <div className="flex flex-col">
                      <dt className="text-label-sm text-text-secondary">{label}</dt>
                      <dd className="text-h3 text-text-heading tabular-nums">{count}건</dd>
                    </div>
                  </div>
                ))}
              </dl>
            )}
            {activity.data?.length ? (
              <ul className="flex flex-col">
                {activity.data.map((a) => (
                  <li key={a.id} className={`flex items-center justify-between gap-3 py-3 ${ROW}`}>
                    {a.href ? (
                      <Link
                        href={a.href}
                        className="truncate text-body-sm text-text-body hover:text-text-brand"
                      >
                        {a.text}
                      </Link>
                    ) : (
                      <span className="truncate text-body-sm text-text-body">{a.text}</span>
                    )}
                    <time
                      dateTime={a.at}
                      className="shrink-0 text-label-sm text-text-secondary tabular-nums"
                    >
                      {formatComputedAt(a.at)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        </div>
        <div className="col-span-2 flex flex-col gap-5">
          <Card title="결정 대기 검토" href="/reviews">
            {reviews.isPending ? (
              <Muted>불러오는 중이에요…</Muted>
            ) : reviews.isError ? (
              <Muted>검토를 불러오지 못했어요.</Muted>
            ) : reviews.data.length === 0 ? (
              <Muted>결정을 기다리는 검토가 없어요.</Muted>
            ) : (
              <ul className="flex flex-col">
                {reviews.data.slice(0, TOP).map((r) => (
                  <li key={r.id} className={ROW}>
                    <Link
                      href={`/reviews/${r.id}`}
                      className="flex items-center justify-between gap-3 py-3 hover:text-text-brand"
                    >
                      <span className="flex flex-col">
                        <span className="text-label-md text-text-heading">{r.part.name}</span>
                        <span className="text-label-sm text-text-secondary">{entryLabelOf(r)}</span>
                      </span>
                      <VerdictTags verdict={r.verdict} flags={r.flags} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="확인할 재고" href="/audit">
            {audits.isPending ? (
              <Muted>불러오는 중이에요…</Muted>
            ) : audits.isError ? (
              <Muted>확인할 재고를 불러오지 못했어요.</Muted>
            ) : audits.data.length === 0 ? (
              <Muted>지금은 확인할 재고가 없어요.</Muted>
            ) : (
              <ul className="flex flex-col">
                {audits.data.slice(0, TOP).map((a) => (
                  <li key={a.id} className={`flex items-center justify-between gap-3 py-3 ${ROW}`}>
                    <span className="flex flex-col">
                      <span className="text-label-md text-text-heading">{a.part.name}</span>
                      <span className="text-label-sm text-text-secondary">
                        {a.status === 'requested' ? `실사 요청됨 · ${a.reason}` : a.reason}
                      </span>
                    </span>
                    <Tag {...GRADE_TAG[a.grade]}>{a.grade}</Tag>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="외부 요인">
            <ul className="flex flex-col">
              {EXTERNAL_FACTORS.map((f) => (
                <li key={f.name} className={`flex items-center justify-between gap-3 py-3 ${ROW}`}>
                  <span className="flex flex-col">
                    <span className="text-label-md text-text-heading">{f.name}</span>
                    <span className="text-label-sm text-text-secondary">{f.effect}</span>
                  </span>
                  <span className="rounded-full bg-bg-subtle px-3 py-1 text-label-sm text-text-secondary">
                    수집 전
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
