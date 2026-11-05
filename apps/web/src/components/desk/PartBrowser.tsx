'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  ABC_CLASSES,
  CATEGORIES,
  CATEGORY_DEFAULTS,
  DEMAND_PATTERNS,
  RISK_LEVELS,
  type AbcClass,
  type Category,
  type DemandPattern,
  type RiskLevel,
} from '@bjk/api/domain/part';
import type { PartListFilters } from '@bjk/api/types/part';

import ErrorState from '@/components/ui/ErrorState';
import Select from '@/components/ui/Select';
import { PILL_SEARCH } from '@/components/ui/controls';
import EmptyState from '@/components/ui/EmptyState';
import FolderCard from '@/components/ui/FolderCard';
import { useParts } from '@/hooks/part/useParts';
import { formatComputedAt, formatDate, formatQty } from '@/utils/format';
import { TABLE, TABLE_CARD, TD, TH, TR } from '@/components/ui/table';
import { NAV_FORWARD } from '@/constants/transitions';

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

// 이름·분류는 왼쪽, 수량은 오른쪽(자릿수 맞춤), 날짜·등급·상태는 가운데. 머리줄과 본문이 같은 값을 쓴다.
const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

// 표 이름은 백엔드 필드명과 다르게 쉬운 말로 보여준다 (abc → 재고 중요도, demand_pattern → 사용 패턴)
const COLUMNS = [
  { label: '부품', align: ALIGN.left, width: '' },
  { label: '카테고리', align: ALIGN.left, width: 'w-28' },
  { label: '현재 재고', align: ALIGN.right, width: 'w-28' },
  { label: '입고 예정', align: ALIGN.right, width: 'w-28' },
  { label: '숨은 재고', align: ALIGN.right, width: 'w-28' },
  { label: '소진 예상', align: ALIGN.center, width: 'w-28' },
  { label: '재고 중요도', align: ALIGN.center, width: 'w-28' },
  { label: '사용 패턴', align: ALIGN.center, width: 'w-24' },
  { label: '위험도', align: ALIGN.center, width: 'w-20' },
  { label: '분석 기준', align: ALIGN.center, width: 'w-32' },
] as const;

// 가로로 밀 때 고정되는 첫 칸. 뒤 칸이 비쳐 보이지 않게 줄무늬·hover 색을 그대로 칠한다
const STICKY_TH = 'sticky left-0 z-10';
const STICKY_TD = 'sticky left-0 z-10 bg-bg-surface group-even:bg-bg-page group-hover:bg-bg-subtle';

// 부품 목록 (W-04). 검색·필터는 URL 에 둔다. 지표는 새벽 배치 값이라 계산 기준 시각을 함께 보여준다.
// usePathname·useSearchParams 를 쓰므로 페이지에서 <Suspense> 로 감싼다.
const PartBrowser = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseFilters(searchParams);
  const [query, setQuery] = useState(filters.q ?? '');
  const { data: parts, isPending, isError, refetch } = useParts(filters);
  // 폴더의 부품 수는 필터 없는 목록에서 센다 (같은 캐시라 추가 요청은 처음 한 번)
  const { data: allParts } = useParts({});
  const countOf = (category?: Category) =>
    allParts
      ? `부품 ${allParts.filter((p) => !category || p.category === category).length}개`
      : '…';

  const update = (patch: Partial<PartListFilters>) =>
    router.replace(`${pathname}${toSearch({ ...filters, ...patch })}`, { scroll: false });

  // 입력할 때마다 바로 거르되, 글자마다 주소·요청이 바뀌지 않게 잠깐 멈췄을 때 반영한다
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);
  const onSearch = (value: string) => {
    setQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => update({ q: value.trim() || undefined }), 250);
  };

  const select = <T extends string>(
    label: string,
    key: keyof PartListFilters,
    options: readonly { value: T; label: string }[],
  ) => (
    <label className="flex items-center gap-2 text-label-md text-text-body">
      {label}
      <Select
        variant="pill"
        value={filters[key] ?? ''}
        onChange={(e) => update({ [key]: e.target.value || undefined })}
      >
        <option value="">전체</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  );

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="카테고리" className="grid grid-cols-5 gap-5">
        <FolderCard
          title="전체"
          count={countOf()}
          foot={`카테고리 ${CATEGORIES.length}개`}
          selected={!filters.category}
          onClick={() => update({ category: undefined })}
        />
        {CATEGORIES.map((category) => (
          <FolderCard
            key={category}
            title={category}
            count={countOf(category)}
            foot={`수입 의존 ${CATEGORY_DEFAULTS[category].importDependency}`}
            selected={filters.category === category}
            onClick={() => update({ category })}
          />
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <div role="search" className="relative">
          <label htmlFor="part-search" className="sr-only">
            부품 검색
          </label>
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-text-secondary"
          />
          <input
            id="part-search"
            type="search"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="이름·규격·별칭"
            className={`${PILL_SEARCH} w-72 pl-12`}
          />
        </div>
        {select(
          '재고 중요도',
          'abc',
          ABC_CLASSES.map((c) => ({ value: c, label: c })),
        )}
        {select(
          '사용 패턴',
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
        <ErrorState title="부품을 불러오지 못했어요" onRetry={() => refetch()} />
      ) : parts.length === 0 ? (
        <EmptyState title="조건에 맞는 부품이 없어요">검색어나 필터를 바꿔 보세요.</EmptyState>
      ) : (
        <div className={TABLE_CARD}>
          {/* 좁은 화면에서는 표만 가로로 밀고, 부품명 칸은 왼쪽에 붙여 둬서 어느 줄인지 놓치지 않게 한다 */}
          <div className="overflow-x-auto">
            <table className={`${TABLE} min-w-5xl table-fixed`}>
              <colgroup>
                {COLUMNS.map((c) => (
                  <col key={c.label} className={c.width} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {COLUMNS.map((c, i) => (
                    <th
                      key={c.label}
                      scope="col"
                      className={`${TH} whitespace-nowrap ${c.align} ${i === 0 ? STICKY_TH : ''}`}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parts.map((part) => (
                  <tr key={part.id} className={`${TR} group h-16`}>
                    <th scope="row" className={`${TD} ${ALIGN.left} ${STICKY_TD} font-normal`}>
                      <Link
                        href={`/parts/${part.id}`}
                        transitionTypes={NAV_FORWARD}
                        className="flex flex-col text-label-md text-text-heading hover:text-text-brand"
                      >
                        <span className="truncate">{part.name}</span>
                        {part.spec ? (
                          <span className="truncate text-label-sm text-text-secondary">
                            {part.spec}
                          </span>
                        ) : null}
                      </Link>
                    </th>
                    <td className={`${TD} ${ALIGN.left} truncate text-text-body`}>
                      {part.category ?? EMPTY}
                    </td>
                    <td className={`${TD} ${ALIGN.right} text-text-heading tabular-nums`}>
                      {formatQty(part.stock, part.unit)}
                    </td>
                    <td className={`${TD} ${ALIGN.right} text-text-body tabular-nums`}>
                      {part.incoming ? formatQty(part.incoming.qty, part.unit) : EMPTY}
                    </td>
                    <td
                      className={`${TD} ${ALIGN.right} tabular-nums ${part.hidden_stock > 0 ? 'text-text-warning' : 'text-text-body'}`}
                    >
                      {part.hidden_stock > 0 ? formatQty(part.hidden_stock, part.unit) : EMPTY}
                    </td>
                    <td className={`${TD} ${ALIGN.center} text-text-body tabular-nums`}>
                      {part.metrics.t_out ? formatDate(part.metrics.t_out) : EMPTY}
                    </td>
                    <td className={`${TD} ${ALIGN.center} text-text-body`}>
                      {part.metrics.abc ?? EMPTY}
                    </td>
                    <td className={`${TD} ${ALIGN.center} text-text-body`}>
                      {part.metrics.demand_pattern
                        ? DEMAND_PATTERNS[part.metrics.demand_pattern]
                        : EMPTY}
                    </td>
                    <td className={`${TD} ${ALIGN.center} text-text-body`}>{part.risk ?? EMPTY}</td>
                    <td className={`${TD} ${ALIGN.center} text-text-secondary tabular-nums`}>
                      {part.metrics.computed_at
                        ? formatComputedAt(part.metrics.computed_at)
                        : EMPTY}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartBrowser;
