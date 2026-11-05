'use client';

import { ChevronLeft, UserRound } from 'lucide-react';
import { useState } from 'react';

import { ROLE_LABEL } from '@bjk/api/domain/auth';
import type { CompanyMember } from '@bjk/api/types/auth';

import { SkeletonLines } from '@/components/ui/feedback/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import { useCompanyMembers } from '@/hooks/auth/useAuthQueries';
import { usePinLogin } from '@/hooks/auth/useAuthMutations';
import { apiErrorMessage, apiErrorStatus } from '@/utils/apiError';

import PinPad from './PinPad';

type WorkerLoginProps = {
  companyCode: string;
};

// 이름 선택 → PIN 4자리 (F-AUTH-02)
const WorkerLogin = ({ companyCode }: WorkerLoginProps) => {
  const membersQuery = useCompanyMembers(companyCode);
  const login = usePinLogin();
  const [member, setMember] = useState<CompanyMember | null>(null);
  const [pin, setPin] = useState('');

  if (membersQuery.isPending) {
    return <SkeletonLines label="직원 목록을 불러오는 중" lines={4} />;
  }
  if (membersQuery.isError) {
    return (
      <ErrorState
        title={apiErrorMessage(membersQuery.error, '직원 목록을 불러오지 못했어요')}
        onRetry={() => membersQuery.refetch()}
      />
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-label-lg text-text-heading">누구세요?</h2>
        <ul className="flex flex-col gap-2">
          {membersQuery.data.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setMember(m)}
                className="flex h-16 w-full items-center gap-3 rounded-xl bg-bg-surface px-5 text-left shadow-card active:bg-bg-subtle"
              >
                <UserRound size={20} aria-hidden className="text-text-secondary" />
                <span className="flex-1 text-label-lg text-text-heading">{m.name}</span>
                <span className="text-label-sm text-text-secondary">{ROLE_LABEL[m.role]}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // 잠금(423)이면 키패드를 막는다. 틀린 PIN 은 지우고 다시 받는다.
  const locked = login.isError && apiErrorStatus(login.error) === 423;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => {
          setMember(null);
          setPin('');
          login.reset();
        }}
        className="-ml-2 flex h-11 w-fit items-center gap-1 px-2 text-label-md text-text-secondary"
      >
        <ChevronLeft size={20} aria-hidden />
        다른 사람
      </button>
      <PinPad
        label={`${member.name}님, PIN을 눌러 주세요`}
        value={pin}
        onChange={(next) => {
          setPin(next);
          if (login.isError && !locked) login.reset();
        }}
        onComplete={(full) =>
          login.mutate(
            { company_code: companyCode, user_id: member.id, pin: full },
            { onError: () => setPin('') },
          )
        }
        disabled={login.isPending || locked}
        error={login.isError ? apiErrorMessage(login.error, '로그인하지 못했어요.') : null}
      />
    </div>
  );
};

export default WorkerLogin;
