'use client';

import { TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { VERDICTS } from '@bjk/api/domain/review';
import type { ReviewListFilters } from '@bjk/api/types/review';
import Button from '@bjk/ui/components/Button';

import Select from '@/components/ui/Select';
import { entryLabelOf } from '@/components/review/labels';
import ReviewStatusTag from '@/components/review/ReviewStatusTag';
import VerdictTags from '@/components/review/VerdictTags';
import EmptyState from '@/components/ui/EmptyState';
import Segmented from '@/components/ui/Segmented';
import { useReviews } from '@/hooks/review/useReviews';
import { formatComputedAt, formatWon } from '@/utils/format';
import { MIN_TOTAL_OPTIONS, parseReviewFilters, toReviewSearch } from '@/utils/reviewFilters';
import { TABLE, TABLE_CARD, TD, TH, TR } from '@/components/ui/table';

// 검토함 (W-02). 필터는 URL 에 두고, 목록은 긴급 → 최근 순으로 서버가 정렬한다.
// usePathname·useSearchParams 를 쓰므로 페이지에서 <Suspense> 로 감싼다.
const ReviewInbox = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseReviewFilters(searchParams);
  const { data: reviews, isPending, isError, refetch } = useReviews(filters);

  const update = (patch: Partial<ReviewListFilters>) =>
    router.replace(`${pathname}${toReviewSearch({ ...filters, ...patch })}`, { scroll: false });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="상태"
          options={
            [
              ['pending', '결정 대기'],
              ['all', '전체'],
            ] as const
          }
          value={filters.status}
          onChange={(status) => update({ status })}
        />

        <label className="flex items-center gap-2 text-label-md text-text-body">
          판정
          <Select
            variant="pill"
            value={filters.verdict ?? ''}
            onChange={(e) =>
              update({ verdict: (e.target.value || undefined) as ReviewListFilters['verdict'] })
            }
          >
            <option value="">전체</option>
            {VERDICTS.map((verdict) => (
              <option key={verdict} value={verdict}>
                {verdict}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex items-center gap-2 text-label-md text-text-body">
          금액
          <Select
            variant="pill"
            value={filters.minTotal}
            onChange={(e) => update({ minTotal: Number(e.target.value) })}
          >
            {MIN_TOTAL_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>

        {/* 켜고 끄는 필터 — 켜지면 선택된 탭처럼 검정 알약 (design-system.md "알약 컨트롤") */}
        <button
          type="button"
          aria-pressed={filters.urgent}
          onClick={() => update({ urgent: !filters.urgent })}
          className={`flex h-11 items-center gap-2 rounded-full px-5 text-label-md shadow-card transition-colors ${
            filters.urgent
              ? 'bg-bg-inverse text-text-on-inverse'
              : 'bg-bg-surface text-text-body hover:bg-bg-subtle'
          }`}
        >
          <TriangleAlert size={16} aria-hidden />
          긴급만
        </button>
      </div>

      {isPending ? (
        <p className="text-body-md text-text-secondary">검토 목록을 불러오는 중이에요…</p>
      ) : isError ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-body-md text-text-danger">검토 목록을 불러오지 못했어요.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            다시 시도
          </Button>
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState title="조건에 맞는 검토가 없어요">
          필터를 바꾸거나 전체를 눌러 보세요.
        </EmptyState>
      ) : (
        <div className={TABLE_CARD}>
          <table className={TABLE}>
            <thead>
              <tr>
                <th scope="col" className={`${TH} text-left`}>
                  부품
                </th>
                <th scope="col" className={`${TH} text-left`}>
                  입구
                </th>
                <th scope="col" className={`${TH} text-left`}>
                  판정
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  원안 총액
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  절감
                </th>
                <th scope="col" className={`${TH} text-left`}>
                  상태
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  요청 시각
                </th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id} className={TR}>
                  <td className={TD}>
                    <Link
                      href={`/reviews/${review.id}`}
                      className="text-label-md text-text-heading hover:text-text-brand"
                    >
                      {review.part.name}
                    </Link>
                  </td>
                  <td className={`${TD} text-text-secondary`}>{entryLabelOf(review)}</td>
                  <td className={TD}>
                    <VerdictTags verdict={review.verdict} flags={review.flags} />
                  </td>
                  <td className={`${TD} text-right text-text-body tabular-nums`}>
                    {review.original.total === null ? '—' : formatWon(review.original.total)}
                  </td>
                  <td className={`${TD} text-right text-text-success tabular-nums`}>
                    {review.proposal.saving ? formatWon(review.proposal.saving) : '—'}
                  </td>
                  <td className={TD}>
                    <ReviewStatusTag status={review.status} />
                  </td>
                  <td className={`${TD} text-right text-text-secondary tabular-nums`}>
                    {formatComputedAt(review.requested_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReviewInbox;
