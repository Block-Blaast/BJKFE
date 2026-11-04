'use client';

import { Copy, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

import { ROLE_LABEL } from '@bjk/api/domain/auth';
import type { StaffRole } from '@bjk/api/types/company';
import Button from '@bjk/ui/components/Button';

import { useCreateInvite } from '@/hooks/company/useCompany';
import { apiErrorMessage } from '@/utils/apiError';
import { formatComputedAt } from '@/utils/format';

const STAFF_ROLES: StaffRole[] = ['worker', 'manager'];

// 초대 QR 만들기 (W-10, F-AUTH-02). 일회용 토큰, 72시간. 작업자는 폰으로 찍어 /invite/[token] 으로 들어온다.
const InviteSection = () => {
  const create = useCreateInvite();
  const [role, setRole] = useState<StaffRole>('worker');
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);

  const invite = create.data;
  const url = invite ? `${window.location.origin}/invite/${invite.token}` : null;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied('ok');
    } catch {
      // 권한이 없거나 http 환경이면 복사가 막힌다 — 링크를 직접 선택해 복사하게 한다
      setCopied('fail');
    }
  };

  if (invite && url) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-md bg-bg-surface p-4 shadow-card">
          {/* QR 은 인식률을 위해 진한 글자색 + 흰 배경으로 고정한다 */}
          <QRCodeSVG
            value={url}
            size={200}
            level="M"
            marginSize={2}
            fgColor="var(--text-heading)"
            bgColor="var(--bg-surface)"
            title={`${ROLE_LABEL[invite.role]} 초대 QR`}
          />
        </div>
        <p className="text-center text-body-sm text-text-body">
          <strong className="text-label-md">{ROLE_LABEL[invite.role]}</strong> 초대 ·{' '}
          <span className="tabular-nums">{formatComputedAt(invite.expires_at)}</span>까지 한 번만 쓸
          수 있어요.
        </p>
        <p className="w-full truncate rounded-md bg-bg-subtle px-3 py-2 text-center text-label-sm text-text-body select-all">
          {url}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={copy}>
            <Copy size={16} aria-hidden />
            링크 복사
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              create.reset();
              setCopied(null);
            }}
          >
            새 QR 만들기
          </Button>
        </div>
        {copied ? (
          <p
            role="status"
            className={`text-body-sm ${copied === 'ok' ? 'text-text-success' : 'text-text-danger'}`}
          >
            {copied === 'ok'
              ? '복사했어요.'
              : '복사하지 못했어요. 위 링크를 직접 선택해 복사하세요.'}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate({ role });
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-label-md text-text-heading">초대할 역할</legend>
        <div className="grid grid-cols-2 gap-2">
          {STAFF_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={role === r}
              onClick={() => setRole(r)}
              className={`h-11 rounded-md border text-label-md ${role === r ? 'border-border-brand bg-bg-brand-subtle text-text-brand' : 'border-border-strong bg-bg-surface text-text-body'}`}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </fieldset>
      <Button type="submit" disabled={create.isPending}>
        <QrCode size={16} aria-hidden />
        {create.isPending ? '만드는 중…' : '초대 QR 만들기'}
      </Button>
      {create.isError ? (
        <p role="alert" className="text-body-sm text-text-danger">
          {apiErrorMessage(create.error, '초대를 만들지 못했어요.')}
        </p>
      ) : null}
      <p className="text-body-sm text-text-secondary">
        QR은 72시간 동안 한 번만 쓸 수 있어요. 직원이 폰으로 찍어 이름과 PIN을 등록하면 다음부터 그
        폰에서 바로 로그인해요.
      </p>
    </form>
  );
};

export default InviteSection;
