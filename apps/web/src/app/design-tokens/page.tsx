import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import Button from '@bjk/ui/components/Button';
import Card from '@bjk/ui/components/Card';
import Input from '@bjk/ui/components/Input';
import StatusChip, { type OrderStatus } from '@bjk/ui/components/StatusChip';

import ToastPreview from './_components/ToastPreview';
import TokenSwatch from './_components/TokenSwatch';

// Figma(sJfs73BOfgYtBrAB3Xx8si)와 눈으로 대조하기 위한 임시 페이지. 디자인 시스템이 안정되면 삭제한다.
export const metadata: Metadata = {
  title: 'Design Tokens',
  robots: { index: false, follow: false },
};

const PRIMITIVE_GROUPS = {
  'Brand · Blue': [
    'brand-50',
    'brand-100',
    'brand-200',
    'brand-300',
    'brand-400',
    'brand-500',
    'brand-600',
    'brand-700',
    'brand-800',
    'brand-900',
  ],
  'Second · Yellow': ['sub-50', 'sub-100', 'sub-300', 'sub-500', 'sub-600', 'sub-700', 'sub-900'],
  'Gray (cool)': [
    'gray-0',
    'gray-50',
    'gray-100',
    'gray-200',
    'gray-300',
    'gray-400',
    'gray-500',
    'gray-600',
    'gray-700',
    'gray-800',
    'gray-900',
  ],
  'Status · Red': ['red-50', 'red-500', 'red-700'],
  'Status · Green': ['green-50', 'green-500', 'green-700'],
  'Status · Orange': ['orange-50', 'orange-500', 'orange-700'],
};

const SEMANTIC_GROUPS = {
  bg: {
    page: 'gray-50',
    surface: 'gray-0',
    subtle: 'gray-100',
    brand: 'brand-600',
    'brand-hover': 'brand-700',
    'brand-pressed': 'brand-800',
    'brand-subtle': 'brand-50',
    'brand-subtle-hover': 'brand-100',
    'brand-subtle-pressed': 'brand-200',
    sub: 'sub-500',
    'sub-subtle': 'sub-50',
    disabled: 'gray-200',
    'danger-subtle': 'red-50',
    'success-subtle': 'green-50',
    'warning-subtle': 'orange-50',
  },
  text: {
    heading: 'gray-800',
    body: 'gray-700',
    secondary: 'gray-500',
    placeholder: 'gray-500',
    disabled: 'gray-400',
    'on-brand': 'gray-0',
    brand: 'brand-700',
    sub: 'sub-700',
    danger: 'red-700',
    success: 'green-700',
    warning: 'orange-700',
  },
  border: {
    default: 'gray-200',
    strong: 'gray-300',
    brand: 'brand-600',
    danger: 'red-500',
  },
  icon: {
    brand: 'brand-700',
    danger: 'red-700',
    success: 'green-700',
    warning: 'orange-700',
  },
};

const TYPOGRAPHY = [
  {
    token: 'display',
    spec: '40/52 Bold',
    className: 'text-display',
    sample: '사기 전에 먼저 검토해요',
  },
  {
    token: 'h1',
    spec: '32/44 Bold',
    className: 'text-h1',
    sample: '화요일 펌프 조립 볼트 120개 부족',
  },
  { token: 'h2', spec: '24/34 Bold', className: 'text-h2', sample: '진짜 없나? 진짜 필요한가?' },
  {
    token: 'h3',
    spec: '20/28 Bold',
    className: 'text-h3',
    sample: '베어링 6205 · 이미 12개 있어요',
  },
  {
    token: 'body-lg',
    spec: '18/28 Regular',
    className: 'text-body-lg',
    sample: '요청한 50개 중 12개는 이미 있어요.',
  },
  {
    token: 'body-md',
    spec: '16/24 Regular',
    className: 'text-body-md',
    sample: '화요일 펌프 조립 전에 발주가 필요해요.',
  },
  {
    token: 'body-sm',
    spec: '14/20 Regular',
    className: 'text-body-sm',
    sample: '기록이 7일뿐이라 소진일은 참고용이에요.',
  },
  { token: 'label-lg', spec: '16/20 Medium', className: 'text-label-lg', sample: '승인하기' },
  { token: 'label-md', spec: '14/20 Medium', className: 'text-label-md', sample: '수량 수정' },
  {
    token: 'label-sm',
    spec: '12/16 Medium',
    className: 'text-label-sm',
    sample: '승인 필요 · 놓친 발주',
  },
];

const STATUSES: OrderStatus[] = ['approve', 'missed', 'unneeded', 'check'];

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-6">
    <h2 className="text-h2 text-text-heading">{title}</h2>
    {children}
  </section>
);

const DesignTokensPage = () => {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 text-text-heading">AI 발주 검토관 Design System</h1>
        <p className="text-body-md text-text-secondary">
          임시 확인용 페이지 — Figma Foundations / Components 와 나란히 놓고 대조하세요.
        </p>
      </header>

      <Section title="Primitives">
        {Object.entries(PRIMITIVE_GROUPS).map(([group, names]) => (
          <div key={group} className="flex flex-col gap-3">
            <h3 className="text-label-lg text-text-heading">{group}</h3>
            <div className="flex flex-wrap gap-3">
              {names.map((name) => (
                <TokenSwatch key={name} cssVar={`--color-${name}`} label={name} />
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Semantic">
        {Object.entries(SEMANTIC_GROUPS).map(([group, tokens]) => (
          <div key={group} className="flex flex-col gap-3">
            <h3 className="text-label-lg text-text-heading">{group}</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(tokens).map(([name, primitive]) => (
                <TokenSwatch
                  key={name}
                  cssVar={`--${group}-${name}`}
                  label={`${group}-${name}`}
                  caption={`→ ${primitive}`}
                />
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-4">
          {TYPOGRAPHY.map(({ token, spec, className, sample }) => (
            <div key={token} className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-6">
              <span className="w-48 shrink-0 text-label-sm text-text-secondary">
                {token} · {spec}
              </span>
              <span className={`${className} text-text-heading`}>{sample}</span>
            </div>
          ))}
          <p className="text-body-md text-text-body tabular-nums">
            tabular-nums: 1,234개 · 120개 · 98,765개
          </p>
        </div>
      </Section>

      <Section title="Radius · Shadow">
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-2">
            <div className="h-20 w-24 rounded-md bg-bg-brand-subtle" />
            <span className="text-label-sm text-text-secondary">radius/md · 12 (입력·작은 칸)</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-20 w-24 rounded-xl bg-bg-brand-subtle" />
            <span className="text-label-sm text-text-secondary">radius/xl · 20 (카드)</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex h-20 w-24 items-center">
              <div className="h-10 w-24 rounded-full bg-bg-brand-subtle" />
            </div>
            <span className="text-label-sm text-text-secondary">full (알약·원형)</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-20 w-24 rounded-md bg-bg-surface shadow-card" />
            <span className="text-label-sm text-text-secondary">shadow-card</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-20 w-24 rounded-md bg-bg-surface shadow-raised" />
            <span className="text-label-sm text-text-secondary">shadow-raised</span>
          </div>
        </div>
      </Section>

      <Section title="Button">
        {(['md', 'lg'] as const).map((size) => (
          <div key={size} className="flex flex-col gap-3">
            <h3 className="text-label-lg text-text-heading">
              Size={size === 'md' ? 'Medium' : 'Large'}
            </h3>
            {(['primary', 'secondary', 'ghost'] as const).map((variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-4">
                <span className="w-24 text-label-sm text-text-secondary">{variant}</span>
                <Button variant={variant} size={size}>
                  승인하기
                </Button>
                <Button variant={variant} size={size} disabled>
                  승인하기
                </Button>
              </div>
            ))}
          </div>
        ))}
        <p className="text-body-sm text-text-secondary">
          Hover / Pressed 는 마우스를 올리거나 눌러서 확인하세요.
        </p>
      </Section>

      <Section title="Status Chip">
        <div className="flex flex-wrap gap-3">
          {STATUSES.map((status) => (
            <StatusChip key={status} status={status} />
          ))}
        </div>
      </Section>

      <Section title="Input">
        <div className="grid gap-6 md:grid-cols-2">
          <Input label="발주 수량" placeholder="수량을 입력하세요" helperText="단위: 개" />
          <Input
            label="발주 수량 (Focus — 클릭해서 확인)"
            placeholder="수량을 입력하세요"
            helperText="단위: 개"
          />
          <Input label="발주 수량" defaultValue="-3" error="0보다 큰 수량을 입력하세요" />
          <Input label="발주 수량" placeholder="수량을 입력하세요" helperText="단위: 개" disabled />
        </div>
      </Section>

      <Section title="Card">
        <div className="grid gap-6 md:grid-cols-2">
          <Card title="베어링 6205">요청한 50개 중 12개는 이미 있어요.</Card>
          <Card title="베어링 6205" variant="highlight">
            요청한 50개 중 12개는 이미 있어요.
          </Card>
        </div>
      </Section>

      <Section title="Toast">
        <ToastPreview />
      </Section>
    </main>
  );
};

export default DesignTokensPage;
