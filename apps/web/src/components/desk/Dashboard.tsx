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
  PackageX,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { AuditGrade } from '@bjk/api/domain/audit';
import type { ActivityKind } from '@bjk/api/types/activity';
import type { Part } from '@bjk/api/types/part';

import { entryLabelOf } from '@/components/review/labels';
import VerdictTags from '@/components/review/VerdictTags';
import ComputedAt from '@/components/ui/ComputedAt';
import IconCircle, { type IconCircleTone } from '@/components/ui/IconCircle';
import Tag, { type TagTone } from '@/components/ui/Tag';
import { useTodayActivity } from '@/hooks/activity/useTodayActivity';
import { useAudits } from '@/hooks/audit/useAudits';
import { useParts } from '@/hooks/part/useParts';
import { useReviews } from '@/hooks/review/useReviews';
import { formatDate, formatQty, formatWon } from '@/utils/format';
import { TABLE, TD, TH, TR } from '@/components/ui/table';

const EMPTY = '—';
const TOP = 5;

const timeFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

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

// 결품 위험 순위: 명세서 우선순위는 P_out × L (F-ANAL-08). 값이 없으면 소진 예상일이 이른 순으로 대신한다.
const riskOrder = (parts: Part[]) => {
  const scored = parts.filter((p) => p.metrics.p_out !== null && p.metrics.loss !== null);
  if (scored.length > 0) {
    return {
      byPriority: true,
      items: [...scored].sort(
        (a, b) => b.metrics.p_out! * b.metrics.loss! - a.metrics.p_out! * a.metrics.loss!,
      ),
    };
  }
  return {
    byPriority: false,
    items: parts
      .filter((p) => p.metrics.t_out !== null)
      .sort((a, b) => a.metrics.t_out!.localeCompare(b.metrics.t_out!)),
  };
};

// 단가가 등록된 부품만 계산할 수 있다
const tiedUpValue = (parts: Part[]) => {
  const priced = parts.filter((p) => p.supplier?.unit_price);
  return {
    total: priced.reduce((sum, p) => sum + p.stock * (p.supplier!.unit_price ?? 0), 0),
    priced: priced.length,
    all: parts.length,
  };
};

const GRADE_TAG: Record<AuditGrade, { tone: TagTone; icon: LucideIcon }> = {
  높음: { tone: 'danger', icon: TriangleAlert },
  중간: { tone: 'warning', icon: CircleAlert },
  낮음: { tone: 'neutral', icon: Info },
};

const ACTIVITY_ICON: Record<ActivityKind, LucideIcon> = {
  movement: Package,
  review_created: Inbox,
  review_decided: Inbox,
  audit_requested: ClipboardCheck,
  audit_resolved: ClipboardCheck,
};

const EXTERNAL_FACTORS = [
  { name: '해상운임', effect: '수입 부품 납기에 여유를 더해요' },
  { name: '명절·춘절 캘린더', effect: '납기 구간에 겹친 연휴만큼 납기를 늘려요' },
  { name: '환율', effect: '수입 부품에 단가 상승 위험을 표시해요' },
];

const ROW = 'border-t border-border-default first:border-t-0';

// 대시보드 (W-01). 다른 화면과 같은 쿼리를 써서, 승인·실사·기록이 생기면 함께 갱신된다.
// 카드마다 따로 불러와서 하나가 실패해도 나머지는 보인다.
// 왼쪽(결품 위험·오늘 활동)과 오른쪽(검토·의심·외부 요인)을 독립 열로 쌓아, 카드 높이가 달라도 빈틈이 생기지 않게 한다.
const Dashboard = () => {
  const reviews = useReviews({ status: 'pending' });
  const audits = useAudits({ status: 'active' });
  const parts = useParts({});
  const activity = useTodayActivity();

  const urgent = reviews.data?.filter((r) => r.flags.includes('긴급')).length ?? 0;
  const highAudits = audits.data?.filter((a) => a.grade === '높음').length ?? 0;
  const risk = parts.data ? riskOrder(parts.data) : null;
  const value = parts.data ? tiedUpValue(parts.data) : null;
  const computedAt = parts.data?.find((p) => p.metrics.computed_at)?.metrics.computed_at;

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
          value={reviews.data ? `${reviews.data.length}건` : EMPTY}
          note={urgent ? `긴급 ${urgent}건` : undefined}
        />
        <Stat
          icon={ClipboardCheck}
          tone="inverse"
          label="확인할 재고"
          value={audits.data ? `${audits.data.length}건` : EMPTY}
          note={highAudits ? `높음 ${highAudits}건` : undefined}
        />
        <Stat
          icon={PackageX}
          tone="gradient"
          label="결품 위험 부품"
          value={risk ? `${risk.items.length}종` : EMPTY}
          note={risk && !risk.byPriority ? '소진 예상일이 있는 부품' : undefined}
        />
        <Stat
          icon={Coins}
          label="묶인 재고 금액"
          value={value ? (value.priced ? formatWon(value.total) : EMPTY) : EMPTY}
          note={value ? `단가 등록 ${value.priced}/${value.all}종 기준` : undefined}
        />
      </div>

      <div className="grid grid-cols-5 items-start gap-5">
        <div className="col-span-3 flex flex-col gap-5">
          <Card title="결품 위험 상위 5" href="/parts">
            {parts.isPending ? (
              <Muted>불러오는 중이에요…</Muted>
            ) : parts.isError ? (
              <Muted>부품을 불러오지 못했어요.</Muted>
            ) : risk!.items.length === 0 ? (
              <Muted>소진이 예상되는 부품이 없어요.</Muted>
            ) : (
              <>
                <table className={`${TABLE} tabular-nums`}>
                  <thead>
                    <tr>
                      <th scope="col" className={`${TH} text-left`}>
                        부품
                      </th>
                      <th scope="col" className={`${TH} text-right`}>
                        현재 재고
                      </th>
                      <th scope="col" className={`${TH} text-right`}>
                        소진 예상
                      </th>
                      <th scope="col" className={`${TH} text-right`}>
                        발주 마감
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {risk!.items.slice(0, TOP).map((p) => (
                      <tr key={p.id} className={TR}>
                        <td className={TD}>
                          <Link
                            href={`/parts/${p.id}`}
                            className="flex items-center gap-3 text-label-md text-text-heading hover:text-text-brand"
                          >
                            <span className="flex size-9 items-center justify-center rounded-full bg-bg-subtle text-text-secondary">
                              <Boxes size={16} aria-hidden />
                            </span>
                            {p.name}
                          </Link>
                        </td>
                        <td className={`${TD} text-right text-text-body`}>
                          {formatQty(p.stock, p.unit)}
                        </td>
                        <td className={`${TD} text-right text-text-body`}>
                          {p.metrics.t_out ? formatDate(p.metrics.t_out) : EMPTY}
                        </td>
                        <td className={`${TD} text-right text-text-heading`}>
                          {p.metrics.t_deadline ? formatDate(p.metrics.t_deadline) : EMPTY}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!risk!.byPriority ? (
                  <Muted>
                    결품 확률 × 예상 손실(우선순위)이 아직 계산 전이라 소진 예상일이 이른 순이에요.
                  </Muted>
                ) : null}
              </>
            )}
          </Card>

          <Card title="오늘 활동">
            {activity.isPending ? (
              <Muted>불러오는 중이에요…</Muted>
            ) : activity.isError ? (
              <Muted>활동을 불러오지 못했어요.</Muted>
            ) : activity.data.length === 0 ? (
              <Muted>오늘은 아직 기록이 없어요.</Muted>
            ) : (
              <ol className="flex flex-col">
                {activity.data.map((event) => {
                  const Icon = ACTIVITY_ICON[event.kind];
                  const body = (
                    <>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-secondary">
                        <Icon size={16} aria-hidden />
                      </span>
                      <span className="flex-1 text-body-sm text-text-body">{event.text}</span>
                      <span className="shrink-0 text-label-sm text-text-secondary tabular-nums">
                        {timeFormat.format(new Date(event.at))}
                      </span>
                    </>
                  );
                  return (
                    <li key={event.id} className={ROW}>
                      {event.href ? (
                        <Link
                          href={event.href}
                          className="flex items-center gap-3 py-3 hover:text-text-brand"
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 py-3">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
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
