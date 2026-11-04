'use client';

import { QrCode } from 'lucide-react';
import { useState } from 'react';

import { useDeviceCompanyCode } from '@/hooks/auth/useDeviceCompanyCode';

import OwnerLoginForm from './OwnerLoginForm';
import WorkerLogin from './WorkerLogin';

type Mode = 'staff' | 'owner';

// 로그인 (M-01). 직원(작업자·관리자)은 이름 + PIN, 사장님은 이메일.
// 이 기기에 회사 코드가 있으면 직원 로그인을 먼저 보여준다.
const LoginView = () => {
  const companyCode = useDeviceCompanyCode();
  const [chosen, setChosen] = useState<Mode | null>(null);
  const mode: Mode = chosen ?? (companyCode ? 'staff' : 'owner');

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-heading">발주콕</h1>
        <p className="text-body-md text-text-secondary">발주의 문제를 콕 짚어드려요.</p>
      </header>

      <div className="flex rounded-md bg-bg-subtle p-1" role="tablist" aria-label="로그인 방식">
        {(
          [
            ['staff', '직원'],
            ['owner', '사장님'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setChosen(value)}
            className={`h-11 flex-1 rounded-md text-label-md ${mode === value ? 'bg-bg-surface text-text-heading shadow-card' : 'text-text-secondary'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'owner' ? (
        <OwnerLoginForm />
      ) : companyCode ? (
        <WorkerLogin companyCode={companyCode} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-md bg-bg-surface p-6 text-center shadow-card">
          <QrCode size={32} aria-hidden className="text-icon-brand" />
          <p className="text-body-md text-text-body">
            이 기기는 아직 회사에 연결되지 않았어요.
            <br />
            사장님께 받은 <strong className="text-label-lg">초대 QR</strong>로 처음 한 번 접속해
            주세요.
          </p>
        </div>
      )}
    </div>
  );
};

export default LoginView;
