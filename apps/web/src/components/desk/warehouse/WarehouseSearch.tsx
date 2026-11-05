'use client';

import { Search } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';

import { PILL_SEARCH } from '@/components/ui/controls';
import { useParts } from '@/hooks/part/useParts';
import { useTwinLayout } from '@/hooks/twin/useTwinLayout';
import { useWarehouseBridge } from '@/hooks/twin/useWarehouseBridge';
import { locsByPart, normalizeSearch } from '@/utils/twin';

const MAX_RESULTS = 8;

type Option = { key: string; title: string; detail: string; locs: string[] };

// 3D 창고(W-11) 부품 검색 — 패널 맨 위(PANEL_TOP_SLOTS).
// 부품 목록은 WarehouseView 와 같은 useParts({}) 캐시에서 걸러 낸다(입력마다 요청하지 않는다).
// canvas 는 키보드로 칸을 고를 수 없어 이 콤보박스가 키보드로 칸에 가는 길이기도 하다: ↑↓ 고르기, Enter 이동, Esc 닫기·지우기.
const WarehouseSearch = () => {
  const bridge = useWarehouseBridge();
  const parts = useParts({});
  const layout = useTwinLayout();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const q = normalizeSearch(query);
  const locsOf = layout.data ? locsByPart(layout.data.placements) : new Map<string, string[]>();
  const matches = q
    ? (parts.data ?? []).filter(
        (p) =>
          locsOf.has(p.id) &&
          [p.name, p.spec ?? '', ...p.aliases].some((t) => normalizeSearch(t).includes(q)),
      )
    : [];

  const options: Option[] = [
    // 여러 부품이 걸리면 한 번에 강조하는 줄을 맨 위에 둔다
    ...(matches.length > 1
      ? [
          {
            key: 'all',
            title: `"${query.trim()}" 결과 ${matches.length}개 모두 보기`,
            detail: '칸을 모두 강조해요',
            locs: matches.flatMap((p) => locsOf.get(p.id) ?? []),
          },
        ]
      : []),
    ...matches.slice(0, MAX_RESULTS).map((p) => ({
      key: p.id,
      title: p.name,
      detail: [p.spec, p.location].filter(Boolean).join(' · '),
      locs: locsOf.get(p.id) ?? [],
    })),
  ];
  const expanded = open && q.length > 0;
  const activeIndex = Math.min(active, Math.max(options.length - 1, 0));

  const choose = (option: Option) => {
    if (option.locs.length === 1) bridge.goTo(option.locs[0]);
    else bridge.focus(option.locs, option.key === 'all' ? `"${query.trim()}" 검색` : option.title);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!options.length) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((activeIndex + step + options.length) % options.length);
    } else if (e.key === 'Enter') {
      const option = options[activeIndex];
      if (!expanded || !option) return;
      e.preventDefault();
      choose(option);
    } else if (e.key === 'Escape') {
      if (expanded) setOpen(false);
      else setQuery('');
    }
  };

  const optionId = (i: number) => `${listId}-${i}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-secondary"
        />
        <input
          type="search"
          role="combobox"
          aria-label="부품 검색"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && options.length ? optionId(activeIndex) : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder="부품 이름·규격으로 칸 찾기"
          autoComplete="off"
          className={`${PILL_SEARCH} w-full pl-12`}
        />
      </div>
      {expanded ? (
        options.length ? (
          <ul
            id={listId}
            role="listbox"
            aria-label="검색 결과"
            className="flex flex-col gap-1 rounded-xl bg-bg-surface p-2 shadow-card"
          >
            {options.map((option, i) => (
              <li
                key={option.key}
                id={optionId(i)}
                role="option"
                aria-selected={i === activeIndex}
                // 입력창의 포커스를 빼앗지 않는다 — 고른 뒤에도 바로 이어서 검색할 수 있게
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(option)}
                className={`flex cursor-pointer flex-col rounded-md px-3 py-2 ${i === activeIndex ? 'bg-bg-subtle' : ''}`}
              >
                <span className="truncate text-label-md text-text-heading">{option.title}</span>
                <span className="truncate text-label-sm text-text-secondary">
                  {option.detail || `칸 ${option.locs.length}개`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p
            id={listId}
            role="status"
            className="rounded-xl bg-bg-surface px-4 py-3 text-body-sm text-text-secondary shadow-card"
          >
            창고에 놓인 부품 중 맞는 이름이 없어요.
          </p>
        )
      ) : null}
    </div>
  );
};

export default WarehouseSearch;
