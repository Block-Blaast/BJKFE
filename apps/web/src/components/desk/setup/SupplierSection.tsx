'use client';

import { Truck } from 'lucide-react';
import { useState } from 'react';

import type { Supplier } from '@bjk/api/types/setup';
import Button from '@bjk/ui/components/Button';
import Input from '@bjk/ui/components/Input';

import { FIELD } from '@/components/ui/controls';
import IconCircle from '@/components/ui/IconCircle';
import { useParts } from '@/hooks/part/useParts';
import { useAddSupplierPrice, useCreateSupplier, useSuppliers } from '@/hooks/setup/useSetup';
import { apiErrorMessage } from '@/utils/apiError';
import { formatDate, formatNumber, formatWon } from '@/utils/format';

import QueryStatus from './QueryStatus';
import SetupCard from './SetupCard';

const EMPTY = '—';

const parseHolidays = (text: string) =>
  text
    .split(/[\s,]+/)
    .map((d) => d.trim())
    .filter(Boolean);

const SupplierForm = () => {
  const create = useCreateSupplier();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [leadDays, setLeadDays] = useState('');
  const [holidays, setHolidays] = useState('');
  const badHoliday = parseHolidays(holidays).some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (badHoliday) return;
        create.mutate(
          {
            name: name.trim(),
            contact: contact.trim() || null,
            default_lead_days: leadDays.trim() === '' ? null : Number(leadDays),
            holidays: parseHolidays(holidays),
          },
          {
            onSuccess: () => {
              setName('');
              setContact('');
              setLeadDays('');
              setHolidays('');
            },
          },
        );
      }}
    >
      <Input label="공급사 이름" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input
        label="연락처"
        type="tel"
        autoComplete="off"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
      />
      <Input
        label="기본 납기 (일)"
        type="number"
        min={0}
        inputMode="numeric"
        helperText="실제 납기 기록이 쌓일 때까지 이 값을 써요."
        value={leadDays}
        onChange={(e) => setLeadDays(e.target.value)}
      />
      <Input
        label="휴무일"
        placeholder="2026-12-31, 2027-01-01"
        helperText="납기 기간과 겹치면 그만큼 납기를 늘려 계산해요."
        error={badHoliday ? '날짜는 2026-12-31 형식으로, 쉼표로 나눠 적어 주세요.' : undefined}
        value={holidays}
        onChange={(e) => setHolidays(e.target.value)}
      />
      {create.isError ? (
        <p role="alert" className="text-body-sm text-text-danger">
          {apiErrorMessage(create.error, '공급사를 등록하지 못했어요.')}
        </p>
      ) : null}
      <Button type="submit" className="self-end" disabled={create.isPending || !name.trim()}>
        {create.isPending ? '등록 중…' : '공급사 등록'}
      </Button>
    </form>
  );
};

const PriceForm = ({ supplier }: { supplier: Supplier }) => {
  const { data: parts } = useParts({});
  const add = useAddSupplierPrice();
  const [partId, setPartId] = useState('');
  const [price, setPrice] = useState('');
  const [moq, setMoq] = useState('');

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        add.mutate(
          {
            id: supplier.id,
            input: {
              part_id: partId,
              unit_price: Number(price),
              moq: moq.trim() === '' ? null : Number(moq),
            },
          },
          {
            onSuccess: () => {
              setPartId('');
              setPrice('');
              setMoq('');
            },
          },
        );
      }}
    >
      <div className="flex items-center gap-2">
        <select
          aria-label={`${supplier.name} 단가 부품`}
          className={`${FIELD} flex-1`}
          value={partId}
          onChange={(e) => setPartId(e.target.value)}
          required
        >
          <option value="">부품 고르기</option>
          {parts?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          aria-label={`${supplier.name} 단가`}
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="단가(원)"
          className={`${FIELD} w-32 tabular-nums`}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <input
          aria-label={`${supplier.name} 최소 주문 수량`}
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="MOQ"
          className={`${FIELD} w-24 tabular-nums`}
          value={moq}
          onChange={(e) => setMoq(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={add.isPending}>
          {add.isPending ? '저장 중…' : '단가 저장'}
        </Button>
      </div>
      {add.isError ? (
        <p role="alert" className="text-body-sm text-text-danger">
          {apiErrorMessage(add.error, '단가를 저장하지 못했어요.')}
        </p>
      ) : null}
    </form>
  );
};

const SupplierCard = ({ supplier }: { supplier: Supplier }) => (
  <SetupCard
    title={supplier.name}
    description={[
      supplier.contact ?? '연락처 없음',
      supplier.default_lead_days === null
        ? '기본 납기 미입력'
        : `기본 납기 ${supplier.default_lead_days}일`,
      supplier.holidays.length > 0 ? `휴무 ${supplier.holidays.map(formatDate).join(', ')}` : null,
    ]
      .filter(Boolean)
      .join(' · ')}
  >
    {supplier.prices.length > 0 ? (
      <table className="w-full text-body-sm">
        <thead className="text-label-sm text-text-secondary">
          <tr>
            <th scope="col" className="py-2 text-left font-medium">
              부품
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              단가
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              MOQ
            </th>
            <th scope="col" className="py-2 pl-6 text-left font-medium">
              단가 구간
            </th>
          </tr>
        </thead>
        <tbody>
          {supplier.prices.map((p) => (
            <tr key={p.part_id} className="border-t border-border-default">
              <td className="py-3 text-label-md text-text-heading">{p.part_name}</td>
              <td className="py-3 text-right text-text-body tabular-nums">
                {formatWon(p.unit_price)}
              </td>
              <td className="py-3 text-right text-text-body tabular-nums">
                {p.moq === null ? EMPTY : formatNumber(p.moq)}
              </td>
              <td className="py-3 pl-6 text-text-body tabular-nums">
                {p.tiers.length === 0
                  ? EMPTY
                  : p.tiers.map((t) => `${t.min_qty}개↑ ${formatWon(t.unit_price)}`).join(' · ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p className="text-body-sm text-text-secondary">등록된 단가가 없어요.</p>
    )}
    <PriceForm supplier={supplier} />
  </SetupCard>
);

// 공급사 (F-SETUP-04). 기본 납기는 실제 납기 기록이 쌓이기 전까지 쓰고(F-ANAL-04),
// 부품별 단가·MOQ 는 수정안의 공급사·수량 계산에 쓴다(F-REVIEW-05).
const SupplierSection = () => {
  const { data: suppliers, isPending, isError, refetch } = useSuppliers();

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 flex flex-col gap-6">
        <QueryStatus isPending={isPending} isError={isError} what="공급사 목록" onRetry={refetch} />
        {suppliers?.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-bg-surface py-12 text-center shadow-card">
            <IconCircle icon={Truck} tone="inverse" />
            <p className="text-body-md text-text-secondary">아직 등록된 공급사가 없어요.</p>
          </div>
        ) : null}
        {suppliers?.map((s) => (
          <SupplierCard key={s.id} supplier={s} />
        ))}
      </div>
      <div>
        <SetupCard title="공급사 등록">
          <SupplierForm />
        </SetupCard>
      </div>
    </div>
  );
};

export default SupplierSection;
