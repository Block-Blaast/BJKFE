'use client';

import { CalendarClock, CircleCheck, Wrench } from 'lucide-react';
import { useState } from 'react';

import Button from '@bjk/ui/components/Button';
import Input from '@bjk/ui/components/Input';

import Select from '@/components/ui/Select';
import IconCircle from '@/components/ui/IconCircle';
import Tag from '@/components/ui/Tag';
import {
  useCompleteMaintenance,
  useCreateMaintenance,
  useEquipment,
  useMaintenance,
} from '@/hooks/setup/useSetup';
import { apiErrorMessage } from '@/utils/apiError';
import { formatComputedAt, formatDate, formatQty } from '@/utils/format';
import { TABLE, TD, TH, TR } from '@/components/ui/table';

import PartQtyFields, { EMPTY_PART_ROW, toPartQtyInput, type PartQtyDraft } from './PartQtyFields';
import QueryStatus from './QueryStatus';
import SetupCard from './SetupCard';

const MaintenanceForm = () => {
  const { data: equipment } = useEquipment();
  const create = useCreateMaintenance();
  const [equipmentId, setEquipmentId] = useState('');
  const [date, setDate] = useState('');
  const [parts, setParts] = useState<PartQtyDraft[]>([EMPTY_PART_ROW]);
  const [invalid, setInvalid] = useState(false);

  if (equipment?.length === 0) {
    return (
      <p className="text-body-md text-text-secondary">
        정비 일정은 설비에 붙어요. 설비 탭에서 먼저 설비를 등록해 주세요.
      </p>
    );
  }

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
          { equipment_id: equipmentId, scheduled_on: date, parts: input },
          {
            onSuccess: () => {
              setDate('');
              setParts([EMPTY_PART_ROW]);
            },
          },
        );
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-2 text-label-md text-text-heading">
          설비
          <Select
            variant="field"
            value={equipmentId}
            onChange={(e) => setEquipmentId(e.target.value)}
            required
          >
            <option value="">설비 고르기</option>
            {equipment?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </label>
        <Input
          label="예정일"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <PartQtyFields legend="필요 부품" rows={parts} onChange={setParts} />
      <p className="text-body-sm text-text-secondary">
        비워 두면 설비에 등록한 정비 1회당 부품·수량을 써요.
      </p>
      {invalid ? (
        <p role="alert" className="text-body-sm text-text-danger">
          부품과 수량(1 이상)을 함께 골라 주세요.
        </p>
      ) : null}
      {create.isError ? (
        <p role="alert" className="text-body-sm text-text-danger">
          {apiErrorMessage(create.error, '정비 일정을 등록하지 못했어요.')}
        </p>
      ) : null}
      <Button type="submit" className="self-end" disabled={create.isPending}>
        {create.isPending ? '등록 중…' : '정비 일정 등록'}
      </Button>
    </form>
  );
};

// 정비 일정 (F-SETUP-04). 정비의 필요 부품은 수요 예측에 "확정 필요량"으로 더해진다 (F-ANAL-03).
const MaintenanceSection = () => {
  const { data: items, isPending, isError, refetch } = useMaintenance();
  const complete = useCompleteMaintenance();

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-3">
        <SetupCard
          title="정비 일정"
          description="정비에 쓸 부품은 사용 기록이 없어도 미리 필요량으로 잡혀요."
        >
          <QueryStatus isPending={isPending} isError={isError} what="정비 일정" onRetry={refetch} />
          {items?.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <IconCircle icon={CalendarClock} tone="inverse" />
              <p className="text-body-md text-text-secondary">
                예정된 정비가 없어요. 등록하지 않으면 사용 기록으로만 예측해요.
              </p>
            </div>
          ) : null}
          {items && items.length > 0 ? (
            <table className={TABLE}>
              <thead>
                <tr>
                  {['예정일', '설비', '필요 부품', '상태'].map((h) => (
                    <th key={h} scope="col" className={`${TH} text-left`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const saving = complete.isPending && complete.variables === item.id;
                  return (
                    <tr key={item.id} className={TR}>
                      <td className={`${TD} text-label-md text-text-heading tabular-nums`}>
                        {formatDate(item.scheduled_on)}
                      </td>
                      <td className={`${TD} text-text-body`}>{item.equipment.name}</td>
                      <td className={`${TD} text-text-body`}>
                        {item.parts
                          .map((p) => `${p.part_name} ${formatQty(p.qty, p.unit)}`)
                          .join(', ')}
                        {item.parts_from_equipment ? (
                          <span className="block text-label-sm text-text-secondary">
                            설비 기준 부품
                          </span>
                        ) : null}
                      </td>
                      <td className={TD}>
                        {item.completed_at ? (
                          <span className="flex items-center gap-2">
                            <Tag tone="success" icon={CircleCheck}>
                              완료
                            </Tag>
                            <span className="text-label-sm text-text-secondary tabular-nums">
                              {formatComputedAt(item.completed_at)}
                            </span>
                          </span>
                        ) : (
                          <Button
                            variant="secondary"
                            disabled={saving}
                            onClick={() => complete.mutate(item.id)}
                          >
                            <Wrench size={16} aria-hidden />
                            {saving ? '처리 중…' : '완료 처리'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
          {complete.isError ? (
            <p role="alert" className="text-body-sm text-text-danger">
              {apiErrorMessage(complete.error, '완료 처리하지 못했어요.')}
            </p>
          ) : null}
        </SetupCard>
      </div>
      <div className="col-span-2">
        <SetupCard title="정비 일정 등록">
          <MaintenanceForm />
        </SetupCard>
      </div>
    </div>
  );
};

export default MaintenanceSection;
