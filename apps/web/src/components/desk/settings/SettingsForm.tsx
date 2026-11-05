'use client';

import { useState } from 'react';

import type { CompanySettings, ReviewSettings, SystemSettings } from '@bjk/api/types/company';
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
  max: number;
};

// 사장님이 바꿀 수 있는 검토 기준값 (SYS-01 review). 범위는 서버 허용 범위와 같다.
const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: '발주 검토 체크',
    fields: [
      {
        key: 'c08_days',
        label: '마감 임박',
        unit: '일',
        spec: 'C-08',
        step: 1,
        min: 1,
        max: 14,
        help: '발주 마감까지 이 일수 이하로 남으면 긴급으로 표시해요.',
      },
      {
        key: 'c05_sigma',
        label: '단가 이상 — 변동폭',
        unit: 'σ',
        spec: 'C-05',
        step: 0.5,
        min: 1,
        max: 3,
        help: '구매 3건 이상: 최근 평균 + 이 배수의 표준편차를 넘으면 경고해요.',
      },
      {
        key: 'c06_ratio',
        label: '더 싼 공급사',
        unit: '배',
        spec: 'C-06',
        step: 0.01,
        min: 0.5,
        max: 0.95,
        help: '다른 공급사 단가가 요청 단가의 이 배율 이하이면 알려요.',
      },
      {
        key: 'c02_months',
        label: '장기 재고화',
        unit: '개월',
        spec: 'C-02',
        step: 1,
        min: 3,
        max: 24,
        help: '발주하면 재고가 이 개월 수보다 오래 쓸 양이 되면 경고해요.',
      },
    ],
  },
  {
    title: '수정안',
    fields: [
      {
        key: 'next_order_weeks',
        label: '다음 발주까지',
        unit: '주',
        spec: 'F-REVIEW-02',
        step: 1,
        min: 1,
        max: 8,
        help: '대비 기간 = 늦을 때 납기 + 이 기간. 길수록 권장 발주량이 늘어요.',
      },
    ],
  },
];

// 시뮬레이션 결과로만 조정하는 값 — 화면에서는 읽기만 한다
const SYSTEM_FIELDS: { label: string; spec: string; value: (s: SystemSettings) => string }[] = [
  {
    label: '단가 이상 — 최소 상승',
    spec: 'C-05',
    value: (s) => `평균 × ${s.c05_min_ratio}`,
  },
  {
    label: '단가 이상 — 기록 적을 때',
    spec: 'C-05',
    value: (s) => `평균 × ${s.c05_small_n_ratio}`,
  },
  {
    label: '놓친 발주 — 결품 확률',
    spec: 'F-MISSED-01',
    value: (s) => `${Math.round(s.missed_p_out_min * 100)}% 이상`,
  },
];

// 서비스 수준은 서버에 0~1 비율로 저장된다. 화면은 % 로 보여준다
const toPercent = (ratio: number) => Math.round(ratio * 1000) / 10;

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
  const [notify, setNotify] = useState(initial.notify);
  const dirty =
    JSON.stringify(review) !== JSON.stringify(initial.review) ||
    JSON.stringify(notify) !== JSON.stringify(initial.notify);

  const setNumber = (key: NumericKey, raw: string) =>
    setReview((prev) => ({ ...prev, [key]: raw === '' ? Number.NaN : Number(raw) }));

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ review, notify });
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
            min={80}
            max={99.5}
            value={
              Number.isNaN(review.service_level[grade])
                ? ''
                : toPercent(review.service_level[grade])
            }
            onChange={(e) =>
              setReview((prev) => ({
                ...prev,
                service_level: {
                  ...prev.service_level,
                  [grade]: e.target.value === '' ? Number.NaN : Number(e.target.value) / 100,
                },
              }))
            }
            helperText={`납기 동안 재고가 모자라지 않을 확률. 높을수록 ${grade}등급 부품을 더 넉넉히 둬요.`}
            required
          />
        ))}
      </Group>

      <Group title="알림 (F-NOTI-03)">
        <Input
          label="조용한 시간 시작"
          type="time"
          value={notify.quiet_hours.start}
          onChange={(e) =>
            setNotify((prev) => ({
              ...prev,
              quiet_hours: { ...prev.quiet_hours, start: e.target.value },
            }))
          }
          helperText="이 시간부터는 긴급 알림도 모아서 아침에 보내요."
          required
        />
        <Input
          label="조용한 시간 끝"
          type="time"
          value={notify.quiet_hours.end}
          onChange={(e) =>
            setNotify((prev) => ({
              ...prev,
              quiet_hours: { ...prev.quiet_hours, end: e.target.value },
            }))
          }
          helperText="이 시간에 모아 둔 알림을 보내요."
          required
        />
        <Input
          label="아침 브리핑"
          type="time"
          min="06:00"
          max="10:00"
          value={notify.briefing_time}
          onChange={(e) => setNotify((prev) => ({ ...prev, briefing_time: e.target.value }))}
          helperText="06:00~10:00 사이에 오늘 할 일 브리핑을 보내요."
          required
        />
      </Group>

      <section className="flex flex-col gap-2">
        <h3 className="text-label-lg text-text-heading">시스템 기준값</h3>
        <p className="text-body-sm text-text-secondary">
          검증 시뮬레이션 결과로만 바뀌는 값이라 여기서는 볼 수만 있어요.
        </p>
        <dl className="grid grid-cols-3 gap-4">
          {SYSTEM_FIELDS.map((f) => (
            <div key={f.label} className="flex flex-col gap-1 rounded-md bg-bg-page p-3">
              <dt className="text-label-sm text-text-secondary">
                {f.label} · {f.spec}
              </dt>
              <dd className="text-label-md text-text-heading tabular-nums">
                {f.value(initial.system)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex items-center gap-3 border-t border-border-default pt-6">
        <Button type="submit" size="lg" disabled={!dirty || save.isPending}>
          {save.isPending ? '저장 중…' : '저장'}
        </Button>
        <Button
          variant="ghost"
          disabled={!dirty || save.isPending}
          onClick={() => {
            setReview(initial.review);
            setNotify(initial.notify);
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
