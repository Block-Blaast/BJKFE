'use client';

import { Factory } from 'lucide-react';
import { useState } from 'react';

import Button from '@bjk/ui/components/Button';
import Input from '@bjk/ui/components/Input';

import IconCircle from '@/components/ui/IconCircle';
import Tag from '@/components/ui/Tag';
import { useCreateEquipment, useEquipment } from '@/hooks/setup/useSetup';
import { apiErrorMessage } from '@/utils/apiError';
import { formatQty, formatWon } from '@/utils/format';

import PartQtyFields, { EMPTY_PART_ROW, toPartQtyInput, type PartQtyDraft } from './PartQtyFields';
import QueryStatus from './QueryStatus';
import SetupCard from './SetupCard';

const optionalNumber = (value: string) => (value.trim() === '' ? null : Number(value));

const EquipmentForm = () => {
  const create = useCreateEquipment();
  const [name, setName] = useState('');
  const [hourlyLoss, setHourlyLoss] = useState('');
  const [dailyHours, setDailyHours] = useState('');
  const [parts, setParts] = useState<PartQtyDraft[]>([EMPTY_PART_ROW]);
  const [invalid, setInvalid] = useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const input = toPartQtyInput(parts);
        if (!input) {
          setInvalid(true);
          return;
        }
        setInvalid(false);
        create.mutate(
          {
            name: name.trim(),
            parts: input,
            hourly_loss: optionalNumber(hourlyLoss),
            daily_hours: optionalNumber(dailyHours),
          },
          {
            onSuccess: () => {
              setName('');
              setHourlyLoss('');
              setDailyHours('');
              setParts([EMPTY_PART_ROW]);
            },
          },
        );
      }}
    >
      <Input label="설비 이름" value={name} onChange={(e) => setName(e.target.value)} required />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="시간당 손실액 (원, 추정)"
          type="number"
          min={0}
          inputMode="numeric"
          helperText="비워 두면 금액 대신 멈추는 설비만 알려요."
          value={hourlyLoss}
          onChange={(e) => setHourlyLoss(e.target.value)}
        />
        <Input
          label="하루 가동 시간"
          type="number"
          min={1}
          max={24}
          step={1}
          inputMode="numeric"
          helperText="비워 두면 8시간으로 계산해요."
          value={dailyHours}
          onChange={(e) => setDailyHours(e.target.value)}
        />
      </div>
      <PartQtyFields legend="정비 1회당 부품·수량" rows={parts} onChange={setParts} />
      {invalid ? (
        <p role="alert" className="text-body-sm text-text-danger">
          부품과 수량(1 이상)을 함께 골라 주세요.
        </p>
      ) : null}
      {create.isError ? (
        <p role="alert" className="text-body-sm text-text-danger">
          {apiErrorMessage(create.error, '설비를 등록하지 못했어요.')}
        </p>
      ) : null}
      <Button type="submit" className="self-end" disabled={create.isPending || !name.trim()}>
        {create.isPending ? '등록 중…' : '설비 등록'}
      </Button>
    </form>
  );
};

// 설비 (F-SETUP-04). 손실액은 미발주 리스크(L = 시간당 손실 × 가동 시간 × LT50)에 쓰인다.
const EquipmentSection = () => {
  const { data: equipment, isPending, isError, refetch } = useEquipment();

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-2">
        <SetupCard
          title="설비"
          description="부품이 떨어지면 어떤 설비가 멈추는지, 그때 손실이 얼마인지 계산하는 데 써요."
        >
          <QueryStatus isPending={isPending} isError={isError} what="설비 목록" onRetry={refetch} />
          {equipment?.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <IconCircle icon={Factory} tone="inverse" />
              <p className="text-body-md text-text-secondary">
                아직 등록된 설비가 없어요. 오른쪽에서 등록해 주세요.
              </p>
            </div>
          ) : null}
          {equipment && equipment.length > 0 ? (
            <ul className="flex flex-col">
              {equipment.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 border-t border-border-default py-4 first:border-t-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-label-lg text-text-heading">{item.name}</span>
                    {item.hourly_loss === null ? (
                      <Tag tone="neutral" icon={Factory}>
                        멈추는 설비만 표시
                      </Tag>
                    ) : (
                      <span className="text-label-md text-text-body tabular-nums">
                        시간당 {formatWon(item.hourly_loss)}
                      </span>
                    )}
                  </div>
                  <span className="text-body-sm text-text-secondary">
                    {item.parts
                      .map((p) => `${p.part_name} ${formatQty(p.qty, p.unit)}`)
                      .join(' · ')}
                    {item.parts.length > 0 ? ' · ' : ''}하루 {item.daily_hours}시간 가동
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </SetupCard>
      </div>
      <div className="col-span-3">
        <SetupCard title="설비 등록">
          <EquipmentForm />
        </SetupCard>
      </div>
    </div>
  );
};

export default EquipmentSection;
