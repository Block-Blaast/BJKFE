'use client';

import { useState } from 'react';

import { ApiError } from '@bjk/api/client';
import { APPROVAL_ACTIONS, type ApprovalAction } from '@bjk/api/domain/review';
import type { Review } from '@bjk/api/types/review';
import Button from '@bjk/ui/components/Button';
import Input from '@bjk/ui/components/Input';

import { useDecideReview } from '@/hooks/review/useDecideReview';

type ApprovalActionsProps = {
  review: Review;
};

const RESULT_MESSAGE: Partial<Record<Review['status'], string>> = {
  발주됨: '승인했어요. 발주 기록이 만들어졌어요.',
  종료: '종료했어요. 요청자에게 결과를 전달했어요.',
  보류: '보완을 기다리는 중이에요. 요청자가 정보를 채우면 다시 검토해요.',
  만료: '7일 동안 처리되지 않아 만료됐어요.',
};

// 판정별 기본 버튼 (F-APPROVAL-01): 수정 권고 → 수정안 승인, 수량 0 → 발주 불필요 수용, 적정 → 승인
const primaryActionOf = (review: Review): ApprovalAction => {
  if (review.verdict === '수정 권고' && review.proposal.qty === 0) return 'acceptNoOrder';
  return 'approveProposal';
};

const errorMessageOf = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.status === 409) return '다른 사람이 먼저 처리했어요. 화면이 최신 결과로 바뀌어요.';
    const body = error.body as { message?: string } | undefined;
    if (body?.message) return body.message;
  }
  return '처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
};

// TODO(auth): 권한(approveReview)이 없으면 숨기고, 본인 요청은 사장님만 승인 (F-AUTH-03)
// TODO: 직접 수정 후 승인(F-REVIEW-09 재검토), 질문하기 — 서버 재검토 API 가 나오면 추가
const ApprovalActions = ({ review }: ApprovalActionsProps) => {
  const decide = useDecideReview();
  const [confirming, setConfirming] = useState<ApprovalAction | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (review.status !== '검토완료') {
    return (
      <p className="rounded-md bg-bg-subtle p-4 text-body-md text-text-body">
        {RESULT_MESSAGE[review.status] ?? `현재 상태: ${review.status}`}
      </p>
    );
  }

  const primary = primaryActionOf(review);
  const primaryLabel = review.verdict === '적정' ? '승인' : APPROVAL_ACTIONS[primary];
  const showOriginal = review.verdict === '수정 권고';

  const submit = (action: ApprovalAction) => {
    decide.mutate(
      {
        review,
        input: action === 'reject' ? { action, reason: rejectReason.trim() } : { action },
      },
      { onSettled: () => setConfirming(null) },
    );
  };

  if (confirming && confirming !== 'reject') {
    const label = confirming === primary ? primaryLabel : APPROVAL_ACTIONS[confirming];
    return (
      <div className="flex flex-col gap-3">
        <p className="text-body-md text-text-heading">{label}할까요? 되돌릴 수 없어요.</p>
        <div className="flex gap-2">
          <Button
            size="lg"
            className="flex-1"
            disabled={decide.isPending}
            onClick={() => submit(confirming)}
          >
            {decide.isPending ? '처리 중…' : `${label} 확인`}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            disabled={decide.isPending}
            onClick={() => setConfirming(null)}
          >
            취소
          </Button>
        </div>
      </div>
    );
  }

  if (confirming === 'reject') {
    return (
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit('reject');
        }}
      >
        <Input
          label="반려 사유"
          placeholder="요청자에게 전달돼요"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          required
        />
        <div className="flex gap-2">
          <Button
            type="submit"
            size="lg"
            className="flex-1"
            disabled={decide.isPending || !rejectReason.trim()}
          >
            {decide.isPending ? '처리 중…' : '반려하기'}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            disabled={decide.isPending}
            onClick={() => setConfirming(null)}
          >
            취소
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {decide.isError ? (
        <p role="alert" className="text-body-sm text-text-danger">
          {errorMessageOf(decide.error)}
        </p>
      ) : null}
      <Button size="lg" onClick={() => setConfirming(primary)}>
        {primaryLabel}
      </Button>
      <div className="flex gap-2">
        {showOriginal ? (
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setConfirming('approveOriginal')}
          >
            {APPROVAL_ACTIONS.approveOriginal}
          </Button>
        ) : null}
        <Button variant="ghost" className="flex-1" onClick={() => setConfirming('reject')}>
          {APPROVAL_ACTIONS.reject}
        </Button>
      </div>
    </div>
  );
};

export default ApprovalActions;
