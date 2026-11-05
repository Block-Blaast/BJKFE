'use client';

import { TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { Verdict } from '@bjk/api/domain/review';
import type { ReviewListFilters } from '@bjk/api/types/review';

import ErrorState from '@/components/ui/ErrorState';
import Select from '@/components/ui/Select';
import { entryLabelOf } from '@/components/review/labels';
import ReviewStatusTag from '@/components/review/ReviewStatusTag';
import VerdictTags from '@/components/review/VerdictTags';
import EmptyState from '@/components/ui/EmptyState';
import FolderCard from '@/components/ui/FolderCard';
import Segmented from '@/components/ui/Segmented';
import { useReviews } from '@/hooks/review/useReviews';
import { formatComputedAt, formatWon } from '@/utils/format';
import { MIN_TOTAL_OPTIONS, parseReviewFilters, toReviewSearch } from '@/utils/reviewFilters';
import { TABLE, TABLE_CARD, TD, TH, TR } from '@/components/ui/table';
import { NAV_FORWARD } from '@/constants/transitions';

// 사장님이 먼저 볼 순서: 고칠 게 있는 것 → 막힌 것 → 그대로 괜찮은 것
const VERDICT_FOLDERS: Verdict[] = ['수정 권고', '보류', '적정'];

// 검토함 (W-02). 필터는 URL 에 두고, 목록은 긴급 → 최근 순으로 서버가 정렬한다.
// usePathname·useSearchParams 를 쓰므로 페이지에서 <Suspense> 로 감싼다.
const ReviewInbox = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseReviewFilters(searchParams);
  const { data: reviews, isPending, isError, refetch } = useReviews(filters);
  // 폴더의 건수는 판정만 뺀 같은 조건으로 센다
  const { data: byVerdict } = useReviews({ ...filters, verdict: undefined });
  const ofVerdict = (verdict?: Verdict) =>
    byVerdict?.filter((r) => !verdict || r.verdict === verdict);
  const countOf = (verdict?: Verdict) => {
    const list = ofVerdict(verdict);
    return list ? `${list.length}건` : '…';
  };
  const savingOf = (verdict: Verdict) =>
    formatWon((ofVerdict(verdict) ?? []).reduce((sum, r) => sum + (r.proposal.saving ?? 0), 0));
  const FOLDER_FOOT: Record<Verdict, string> = {
    '수정 권고': `절감 합계 ${savingOf('수정 권고')}`,
    보류: '정보 보완이 필요해요',
    적정: '그대로 발주해도 돼요',
  };

  const update = (patch: Partial<ReviewListFilters>) =>
    router.replace(`${pathname}${toReviewSearch({ ...filters, ...patch })}`, { scroll: false });

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="판정" className="grid grid-cols-5 gap-5">
        <FolderCard
          title="전체"
          count={countOf()}
          foot={`긴급 ${(byVerdict ?? []).filter((r) => r.flags.includes('긴급')).length}건`}
          selected={!filters.verdict}
          onClick={() => update({ verdict: undefined })}
        />
        {VERDICT_FOLDERS.map((verdict) => (
          <FolderCard
            key={verdict}
            title={verdict}
            count={countOf(verdict)}
            foot={FOLDER_FOOT[verdict]}
            selected={filters.verdict === verdict}
            onClick={() => update({ verdict })}
          />
        ))}
      </nav>
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

        {/* 선택지("전체 금액", "10만 원 이상")가 이미 금액이라고 말해서 보이는 라벨은 두지 않는다 */}
        <Select
          variant="pill"
          aria-label="금액"
          value={filters.minTotal}
          onChange={(e) => update({ minTotal: Number(e.target.value) })}
        >
          {MIN_TOTAL_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

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
        <ErrorState title="검토 목록을 불러오지 못했어요" onRetry={() => refetch()} />
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
                      transitionTypes={NAV_FORWARD}
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
