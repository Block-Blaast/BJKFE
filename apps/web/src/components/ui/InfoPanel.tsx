import type { ReactNode } from 'react';

// 상세 화면 오른쪽 정보 패널의 부품들 (참고: Kintsugi Info). 순서: 막대 카드 → 속성 목록 → 점 태그.

const InfoPanel = ({ title, children }: { title: string; children: ReactNode }) => (
  <aside className="flex flex-col gap-6 rounded-xl bg-bg-surface p-6 shadow-card">
    <h2 className="text-h3 text-text-heading">{title}</h2>
    {children}
  </aside>
);

export const InfoSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h3 className="text-label-lg text-text-heading">{title}</h3>
    {children}
  </section>
);

// 큰 숫자 하나 + (막대) + 작은 설명
export const MeterCard = ({
  label,
  value,
  note,
  children,
}: {
  label: string;
  value: string;
  note?: ReactNode;
  children?: ReactNode;
}) => (
  <div className="flex flex-col gap-2 rounded-md border border-border-default bg-bg-surface p-4">
    <span className="text-label-md text-text-secondary">{label}</span>
    <span className="text-h2 text-text-heading tabular-nums">{value}</span>
    {children}
    {note ? <span className="text-label-sm text-text-secondary">{note}</span> : null}
  </div>
);

// 라벨 왼쪽 · 값 오른쪽
export const PropertyList = ({
  items,
}: {
  items: { label: ReactNode; value: ReactNode; tone?: 'warning' }[];
}) => (
  <dl className="flex flex-col gap-3">
    {items.map(({ label, value, tone }, i) => (
      <div key={i} className="flex items-baseline justify-between gap-4">
        <dt className="flex shrink-0 items-center gap-2 text-body-sm text-text-secondary">
          {label}
        </dt>
        <dd
          className={`truncate text-label-md tabular-nums ${tone === 'warning' ? 'text-text-warning' : 'text-text-heading'}`}
        >
          {value}
        </dd>
      </div>
    ))}
  </dl>
);

const DOT_CLASS = {
  brand: 'bg-bg-brand',
  danger: 'bg-border-danger',
  warning: 'bg-icon-warning',
  neutral: 'bg-border-strong',
  inverse: 'bg-bg-inverse',
} as const;

// 점 찍힌 작은 태그. 의미는 글씨가 전하고 점 색은 보조다 (원칙 9).
// 목록(<ul>) 안이면 li, 버튼·표 칸 안이면 span 으로 그린다.
// span 은 한 줄 칸에 들어가는 상태 태그라 줄바꿈하지 않고, li 는 긴 별칭·체크 이름이 좁은 패널에서 줄바꿈된다.
export const DotTag = ({
  tone = 'neutral',
  as: Tag = 'li',
  children,
}: {
  tone?: keyof typeof DOT_CLASS;
  as?: 'li' | 'span';
  children: ReactNode;
}) => (
  <Tag
    className={`flex w-fit items-center gap-2 rounded-md border border-border-default bg-bg-surface px-2 py-1 text-label-sm text-text-body ${
      Tag === 'span' ? 'shrink-0 whitespace-nowrap' : ''
    }`}
  >
    <span aria-hidden className={`size-1.5 rounded-full ${DOT_CLASS[tone]}`} />
    {children}
  </Tag>
);

export default InfoPanel;
