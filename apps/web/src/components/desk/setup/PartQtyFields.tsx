'use client';

import { Plus, X } from 'lucide-react';

import Button from '@bjk/ui/components/Button';

import Select from '@/components/ui/Select';
import { FIELD } from '@/components/ui/controls';
import { useParts } from '@/hooks/part/useParts';

export type PartQtyDraft = { part_id: string; qty: string };

export const EMPTY_PART_ROW: PartQtyDraft = { part_id: '', qty: '' };

// 비어 있는 줄은 빼고, 수량이 양수가 아니면 null (폼에서 오류로 보여준다)
export const toPartQtyInput = (rows: PartQtyDraft[]) => {
  const filled = rows.filter((r) => r.part_id || r.qty);
  const parsed = filled.map((r) => ({ part_id: r.part_id, qty: Number(r.qty) }));
  return parsed.every((r) => r.part_id && Number.isFinite(r.qty) && r.qty > 0) ? parsed : null;
};

type PartQtyFieldsProps = {
  legend: string;
  rows: PartQtyDraft[];
  onChange: (rows: PartQtyDraft[]) => void;
};

// 부품 + 수량 여러 줄 (설비가 쓰는 부품, 정비 필요 부품)
const PartQtyFields = ({ legend, rows, onChange }: PartQtyFieldsProps) => {
  const { data: parts } = useParts({});
  const set = (index: number, patch: Partial<PartQtyDraft>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label-md text-text-heading">{legend}</legend>
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select
            aria-label={`${legend} ${index + 1} 부품`}
            variant="field"
            className="flex-1"
            value={row.part_id}
            onChange={(e) => set(index, { part_id: e.target.value })}
          >
            <option value="">부품 고르기</option>
            {parts?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.spec ? ` (${p.spec})` : ''}
              </option>
            ))}
          </Select>
          <input
            aria-label={`${legend} ${index + 1} 수량`}
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="수량"
            className={`${FIELD} w-24 tabular-nums`}
            value={row.qty}
            onChange={(e) => set(index, { qty: e.target.value })}
          />
          <button
            type="button"
            aria-label={`${index + 1}번째 줄 지우기`}
            disabled={rows.length === 1}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            className="flex size-10 items-center justify-center rounded-full text-text-secondary hover:bg-bg-page disabled:text-text-disabled"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        className="self-start"
        onClick={() => onChange([...rows, EMPTY_PART_ROW])}
      >
        <Plus size={16} aria-hidden />
        부품 추가
      </Button>
    </fieldset>
  );
};

export default PartQtyFields;
