'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import {
  ABC_CLASSES,
  CATEGORIES,
  DEMAND_PATTERNS,
  RISK_LEVELS,
  type AbcClass,
  type Category,
  type DemandPattern,
  type RiskLevel,
} from '@bjk/api/domain/part';
import type { PartListFilters } from '@bjk/api/types/part';
import Button from '@bjk/ui/components/Button';

import { PILL_SEARCH, PILL_SELECT } from '@/components/ui/controls';
import EmptyState from '@/components/ui/EmptyState';
import { useParts } from '@/hooks/part/useParts';
import { formatComputedAt, formatDate, formatQty } from '@/utils/format';
import { TABLE, TABLE_CARD, TD, TH, TR } from '@/components/ui/table';

const pick = <T extends string>(value: string | null, allowed: readonly T[]) =>
  value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

const parseFilters = (params: URLSearchParams): PartListFilters => ({
  q: params.get('q') ?? undefined,
  category: pick<Category>(params.get('category'), CATEGORIES),
  abc: pick<AbcClass>(params.get('abc'), ABC_CLASSES),
  pattern: pick<DemandPattern>(
    params.get('pattern'),
    Object.keys(DEMAND_PATTERNS) as DemandPattern[],
  ),
  risk: pick<RiskLevel>(params.get('risk'), RISK_LEVELS),
});

const toSearch = (filters: PartListFilters) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.toString();
  return query ? `?${query}` : '';
};

const EMPTY = '—';

// 부품 목록 (W-04). 검색·필터는 URL 에 둔다. 지표는 새벽 배치 값이라 계산 기준 시각을 함께 보여준다.
// usePathname·useSearchParams 를 쓰므로 페이지에서 <Suspense> 로 감싼다.
const PartBrowser = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseFilters(searchParams);
  const [query, setQuery] = useState(filters.q ?? '');
  const { data: parts, isPending, isError, refetch } = useParts(filters);

  const update = (patch: Partial<PartListFilters>) =>
    router.replace(`${pathname}${toSearch({ ...filters, ...patch })}`, { scroll: false });

  const select = <T extends string>(
    label: string,
    key: keyof PartListFilters,
    options: readonly { value: T; label: string }[],
  ) => (
    <label className="flex items-center gap-2 text-label-md text-text-body">
      {label}
      <select
        className={PILL_SELECT}
        value={filters[key] ?? ''}
        onChange={(e) => update({ [key]: e.target.value || undefined })}
      >
        <option value="">전체</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <form
          className="flex items-center gap-2"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: query.trim() || undefined });
          }}
        >
          <label htmlFor="part-search" className="sr-only">
            부품 검색
          </label>
          <input
            id="part-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·규격·별칭"
            className={`${PILL_SEARCH} w-64`}
          />
          <Button type="submit" variant="secondary" aria-label="검색">
            <Search size={16} aria-hidden />
          </Button>
        </form>
        {select(
          '카테고리',
          'category',
          CATEGORIES.map((c) => ({ value: c, label: c })),
        )}
        {select(
          'ABC',
          'abc',
          ABC_CLASSES.map((c) => ({ value: c, label: c })),
        )}
        {select(
          '수요 유형',
          'pattern',
          (Object.entries(DEMAND_PATTERNS) as [DemandPattern, string][]).map(([value, label]) => ({
            value,
            label,
          })),
        )}
        {select(
          '위험도',
          'risk',
          RISK_LEVELS.map((r) => ({ value: r, label: r })),
        )}
      </div>

      {isPending ? (
        <p className="text-body-md text-text-secondary">부품을 불러오는 중이에요…</p>
      ) : isError ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-body-md text-text-danger">부품을 불러오지 못했어요.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            다시 시도
          </Button>
        </div>
      ) : parts.length === 0 ? (
        <EmptyState title="조건에 맞는 부품이 없어요">검색어나 필터를 바꿔 보세요.</EmptyState>
      ) : (
        <div className={TABLE_CARD}>
          <table className={TABLE}>
            <thead>
              <tr>
                {[
                  '부품',
                  '카테고리',
                  '현재 재고',
                  '입고 예정',
                  '숨은 재고',
                  '소진 예상',
                  'ABC',
                  '수요 유형',
                  '위험도',
                  '계산 기준',
                ].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`${TH} ${i >= 2 && i <= 4 ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => (
                <tr key={part.id} className={TR}>
                  <td className={TD}>
                    <Link
                      href={`/parts/${part.id}`}
                      className="flex flex-col text-label-md text-text-heading hover:text-text-brand"
                    >
                      {part.name}
                      {part.spec ? (
                        <span className="text-label-sm text-text-secondary">{part.spec}</span>
                      ) : null}
                    </Link>
                  </td>
                  <td className={`${TD} text-text-body`}>{part.category ?? EMPTY}</td>
                  <td className={`${TD} text-right text-text-heading tabular-nums`}>
                    {formatQty(part.stock, part.unit)}
                  </td>
                  <td className={`${TD} text-right text-text-body tabular-nums`}>
                    {part.incoming ? formatQty(part.incoming.qty, part.unit) : EMPTY}
                  </td>
                  <td
                    className={`${TD} text-right tabular-nums ${part.hidden_stock > 0 ? 'text-text-warning' : 'text-text-body'}`}
                  >
                    {part.hidden_stock > 0 ? formatQty(part.hidden_stock, part.unit) : EMPTY}
                  </td>
                  <td className={`${TD} text-text-body tabular-nums`}>
                    {part.metrics.t_out ? formatDate(part.metrics.t_out) : EMPTY}
                  </td>
                  <td className={`${TD} text-text-body`}>{part.metrics.abc ?? EMPTY}</td>
                  <td className={`${TD} text-text-body`}>
                    {part.metrics.demand_pattern
                      ? DEMAND_PATTERNS[part.metrics.demand_pattern]
                      : EMPTY}
                  </td>
                  <td className={`${TD} text-text-body`}>{part.risk ?? EMPTY}</td>
                  <td className={`${TD} text-text-secondary tabular-nums`}>
                    {part.metrics.computed_at ? formatComputedAt(part.metrics.computed_at) : EMPTY}
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

export default PartBrowser;
