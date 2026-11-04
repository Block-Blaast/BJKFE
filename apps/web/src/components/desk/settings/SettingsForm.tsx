'use client';

import { useState } from 'react';

import type { CompanySettings, ReviewSettings } from '@bjk/api/types/company';
import Button from '@bjk/ui/components/Button';
import Input from '@bjk/ui/components/Input';

import ComputedAt from '@/components/ui/ComputedAt';
import { useUpdateCompanySettings } from '@/hooks/company/useCompany';
import { apiErrorMessage } from '@/utils/apiError';

type NumericKey = Exclude<keyof ReviewSettings, 'service_level'>;

type Field = {
  key: NumericKey;
  label: string;
  unit: string;
  help: string;
  spec: string;
  step: number;
  min: number;
  max?: number;
};

// 명세서에서 "회사별 설정값"으로 정한 숫자들. 설명은 그 숫자가 판정에 어떻게 쓰이는지다.
const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: '발주 검토 체크',
    fields: [
      {
        key: 'deadline_days',
        label: '마감 임박',
        unit: '일',
        spec: 'C-08',
        step: 1,
        min: 1,
        help: '발주 마감까지 이 일수 이하로 남으면 긴급으로 표시해요.',
      },
      {
        key: 'price_sigma',
        label: '단가 이상 — 변동폭',
        unit: 'σ',
        spec: 'C-05',
        step: 0.5,
        min: 0.5,
        help: '구매 3건 이상: 최근 평균 + 이 배수의 표준편차를 넘으면 경고해요.',
      },
      {
        key: 'price_min_ratio',
        label: '단가 이상 — 최소 상승',
        unit: '배',
        spec: 'C-05',
        step: 0.01,
        min: 1,
        help: '구매 3건 이상: 평균의 이 배율도 함께 넘어야 경고해요. 소폭 변동은 넘어가요.',
      },
      {
        key: 'price_few_ratio',
        label: '단가 이상 — 기록 적을 때',
        unit: '배',
        spec: 'C-05',
        step: 0.01,
        min: 1,
        help: '구매 1~2건: 평균의 이 배율을 넘으면 경고해요.',
      },
      {
        key: 'cheaper_ratio',
        label: '더 싼 공급사',
        unit: '배',
        spec: 'C-06',
        step: 0.01,
        min: 0.5,
        max: 0.99,
        help: '다른 공급사 단가가 요청 단가의 이 배율 이하이면 알려요.',
      },
    ],
  },
  {
    title: '수정안',
    fields: [
      {
        key: 'supplier_keep_pct',
        label: '요청 공급사 유지',
        unit: '%',
        spec: 'F-REVIEW-05',
        step: 1,
        min: 0,
        help: '요청한 공급사가 최저가와 이 비율 이내면 공급사를 바꾸지 않아요.',
      },
      {
        key: 'tier_increase_pct',
        label: '단가 구간 대안',
        unit: '%',
        spec: 'F-REVIEW-05',
        step: 1,
        min: 0,
        help: '다음 단가 구간까지 늘려도 총액이 이 비율 이내로 늘면 대안으로 보여줘요.',
      },
      {
        key: 'next_order_weeks',
        label: '다음 발주까지',
        unit: '주',
        spec: 'F-REVIEW-02',
        step: 1,
        min: 1,
        help: '대비 기간 = 늦을 때 납기 + 이 기간. 길수록 권장 발주량이 늘어요.',
      },
    ],
  },
  {
    title: '놓친 발주 찾기 (매일 07:00)',
    fields: [
      {
        key: 'missed_p_out_pct',
        label: '결품 확률',
        unit: '%',
        spec: 'F-MISSED-01',
        step: 5,
        min: 5,
        max: 100,
        help: '결품 확률이 이 값 이상인 부품을 찾아요.',
      },
      {
        key: 'missed_deadline_days',
        label: '마감 여유',
        unit: '일',
        spec: 'F-MISSED-01',
        step: 1,
        min: 0,
        help: '발주 마감이 오늘부터 이 일수 안에 오는 부품만 초안을 만들어요.',
      },
    ],
  },
];

const ABC = ['A', 'B', 'C'] as const;

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="flex flex-col gap-4">
    <legend className="pb-2 text-label-lg text-text-heading">{title}</legend>
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">{children}</div>
  </fieldset>
);

type SettingsFormProps = {
  initial: CompanySettings;
};

// 검토 기준값·알림 시간 (W-10). 사장님 전용 (F-AUTH-03).
// 부모에서 key={updated_at} 로 다시 마운트해, 저장된 값이 바뀌면 폼도 새 값에서 시작한다.
const SettingsForm = ({ initial }: SettingsFormProps) => {
  const save = useUpdateCompanySettings();
  const [review, setReview] = useState(initial.review);
  const [notifications, setNotifications] = useState(initial.notifications);
  const dirty =
    JSON.stringify(review) !== JSON.stringify(initial.review) ||
    JSON.stringify(notifications) !== JSON.stringify(initial.notifications);

  const setNumber = (key: NumericKey, raw: string) =>
    setReview((prev) => ({ ...prev, [key]: raw === '' ? Number.NaN : Number(raw) }));

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ review, notifications });
      }}
    >
      {GROUPS.map((group) => (
        <Group key={group.title} title={group.title}>
          {group.fields.map((f) => (
            <Input
              key={f.key}
              label={`${f.label} (${f.unit}) · ${f.spec}`}
              type="number"
              inputMode="decimal"
              step={f.step}
              min={f.min}
              max={f.max}
              value={Number.isNaN(review[f.key]) ? '' : review[f.key]}
              onChange={(e) => setNumber(f.key, e.target.value)}
              helperText={f.help}
              required
            />
          ))}
        </Group>
      ))}

      <Group title="재주문점 서비스 수준 (F-ANAL-06)">
        {ABC.map((grade) => (
          <Input
            key={grade}
            label={`${grade}등급 (%)`}
            type="number"
            inputMode="decimal"
            step={0.5}
            min={50}
            max={99.9}
            value={Number.isNaN(review.service_level[grade]) ? '' : review.service_level[grade]}
            onChange={(e) =>
              setReview((prev) => ({
                ...prev,
                service_level: {
                  ...prev.service_level,
                  [grade]: e.target.value === '' ? Number.NaN : Number(e.target.value),
                },
              }))
            }
            helperText={`납기 동안 재고가 모자라지 않을 확률. 높을수록 ${grade}등급 부품을 더 넉넉히 둬요.`}
            required
          />
        ))}
      </Group>

      <Group title="조용한 시간 (F-NOTI-03)">
        <Input
          label="시작"
          type="time"
          value={notifications.quiet_start}
          onChange={(e) => setNotifications((prev) => ({ ...prev, quiet_start: e.target.value }))}
          helperText="이 시간부터는 긴급 알림도 모아서 아침에 보내요."
          required
        />
        <Input
          label="끝"
          type="time"
          value={notifications.quiet_end}
          onChange={(e) => setNotifications((prev) => ({ ...prev, quiet_end: e.target.value }))}
          helperText="이 시간에 모아 둔 알림을 보내요."
          required
        />
      </Group>

      <div className="flex items-center gap-3 border-t border-border-default pt-6">
        <Button type="submit" size="lg" disabled={!dirty || save.isPending}>
          {save.isPending ? '저장 중…' : '저장'}
        </Button>
        <Button
          variant="ghost"
          disabled={!dirty || save.isPending}
          onClick={() => {
            setReview(initial.review);
            setNotifications(initial.notifications);
            save.reset();
          }}
        >
          되돌리기
        </Button>
        {save.isError ? (
          <p role="alert" className="text-body-sm text-text-danger">
            {apiErrorMessage(save.error, '저장하지 못했어요.')}
          </p>
        ) : initial.updated_at ? (
          <span className="text-label-sm text-text-secondary">
            마지막 저장 <ComputedAt at={initial.updated_at} />
          </span>
        ) : (
          <span className="text-label-sm text-text-secondary">명세서 기본값이에요.</span>
        )}
      </div>
    </form>
  );
};

export default SettingsForm;
