'use client';

import { ROLE_LABEL } from '@bjk/api/domain/auth';
import type { StaffRole } from '@bjk/api/types/company';

import ErrorState from '@/components/ui/ErrorState';
import Select from '@/components/ui/Select';
import { useCompanyStaff } from '@/hooks/audit/useAudits';
import { useUpdateMemberRole } from '@/hooks/company/useCompany';
import { apiErrorMessage } from '@/utils/apiError';

const STAFF_ROLES: StaffRole[] = ['worker', 'manager'];

// 직원 목록·역할 변경 (W-10, F-AUTH-03). 사장님 계정은 이 목록에 없고 바꿀 수 없다.
const StaffSection = () => {
  const staff = useCompanyStaff();
  const update = useUpdateMemberRole();

  if (staff.isPending)
    return <p className="text-body-sm text-text-secondary">불러오는 중이에요…</p>;
  if (staff.isError) {
    return (
      <ErrorState
        title="직원 목록을 불러오지 못했어요"
        onRetry={() => staff.refetch()}
        size="inline"
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col">
        {staff.data.map((member) => {
          const saving = update.isPending && update.variables?.id === member.id;
          return (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 border-t border-border-default py-3 first:border-t-0"
            >
              <span className="text-label-md text-text-heading">{member.name}</span>
              <label className="flex items-center gap-2 text-label-sm text-text-secondary">
                <span className="sr-only">{member.name} 역할</span>
                {saving ? '저장 중…' : null}
                <Select
                  variant="pill"
                  value={member.role}
                  disabled={saving || member.role === 'owner'}
                  onChange={(e) =>
                    update.mutate({ id: member.id, role: e.target.value as StaffRole })
                  }
                >
                  {STAFF_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
                </Select>
              </label>
            </li>
          );
        })}
      </ul>
      {update.isError ? (
        <p role="alert" className="text-body-sm text-text-danger">
          {apiErrorMessage(update.error, '역할을 바꾸지 못했어요.')}
        </p>
      ) : null}
      <p className="text-body-sm text-text-secondary">
        관리자는 발주 승인·기준 정보·실사 요청을 할 수 있어요. 검토 기준값과 직원 관리는 사장님만 할
        수 있어요.
      </p>
    </div>
  );
};

export default StaffSection;
