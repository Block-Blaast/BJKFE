'use client';

import { QrCode } from 'lucide-react';
import { useState } from 'react';

import { ROLE_LABEL } from '@bjk/api/domain/auth';
import Button from '@bjk/ui/components/Button';
import Input from '@bjk/ui/components/Input';

import { useAcceptInvite } from '@/hooks/auth/useAuthMutations';
import { useInvite } from '@/hooks/auth/useAuthQueries';
import { apiErrorMessage } from '@/utils/apiError';

import PinPad from './PinPad';

type Step = 'name' | 'pin' | 'confirm';

type InviteViewProps = {
  token: string;
};

// 초대 수락 (F-AUTH-02): 이름 → PIN → PIN 확인. 성공하면 회사 코드가 기기에 저장된다.
const InviteView = ({ token }: InviteViewProps) => {
  const inviteQuery = useInvite(token);
  const accept = useAcceptInvite(token);
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [mismatch, setMismatch] = useState(false);

  if (inviteQuery.isPending) {
    return <p className="text-body-md text-text-secondary">초대를 확인하는 중이에요…</p>;
  }
  if (inviteQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-bg-surface p-8 text-center shadow-card">
        <QrCode size={32} aria-hidden className="text-icon-warning" />
        <p className="text-label-lg text-text-heading">이 초대는 쓸 수 없어요.</p>
        <p className="text-body-md text-text-body">
          {apiErrorMessage(inviteQuery.error, '사장님께 새 QR을 요청하세요.')}
        </p>
      </div>
    );
  }

  const invite = inviteQuery.data;
  const header = (
    <header className="flex flex-col gap-1">
      <span className="text-label-sm text-text-secondary">
        {invite.company.name} · {ROLE_LABEL[invite.role]} 초대
      </span>
      <h1 className="text-h2 text-text-heading">발주콕에 오신 걸 환영해요</h1>
    </header>
  );

  if (step === 'name') {
    return (
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) setStep('pin');
        }}
      >
        {header}
        <Input
          label="이름"
          helperText="로그인할 때 이 이름을 골라요. 동료와 겹치지 않게 적어 주세요."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />
        <Button type="submit" size="lg" disabled={!name.trim()}>
          다음
        </Button>
      </form>
    );
  }

  if (step === 'pin') {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <PinPad
          label="사용할 PIN 4자리를 눌러 주세요"
          value={pin}
          onChange={(next) => {
            setPin(next);
            setMismatch(false);
          }}
          onComplete={() => setStep('confirm')}
          error={mismatch ? 'PIN이 서로 달라요. 처음부터 다시 눌러 주세요.' : null}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      <PinPad
        label="한 번 더 눌러 주세요"
        value={confirmPin}
        onChange={(next) => {
          setConfirmPin(next);
          if (accept.isError) accept.reset();
        }}
        onComplete={(full) => {
          if (full !== pin) {
            setPin('');
            setConfirmPin('');
            setMismatch(true);
            setStep('pin');
            return;
          }
          accept.mutate(
            { name: name.trim(), pin },
            {
              onError: () => setConfirmPin(''),
            },
          );
        }}
        disabled={accept.isPending}
        error={accept.isError ? apiErrorMessage(accept.error, '등록하지 못했어요.') : null}
      />
      {accept.isError ? (
        <Button variant="ghost" onClick={() => setStep('name')}>
          이름 고치기
        </Button>
      ) : null}
    </div>
  );
};

export default InviteView;
