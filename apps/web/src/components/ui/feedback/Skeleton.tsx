import type { ReactNode } from 'react';

import { TABLE_CARD } from '@/components/ui/table';

// 불러오는 동안 실제 화면과 같은 모양의 회색 틀을 보여 준다. 글자 "불러오는 중"보다 화면이 덜 튀고,
// 어떤 모양이 올지 미리 보여 기다림이 짧게 느껴진다. 빛이 왼쪽 → 오른쪽으로 지나간다(globals.css `skeleton`).
// 읽기 도구에는 label 만 읽힌다.

type BoneProps = {
  className?: string;
};

// 회색 막대 하나. 크기는 className 으로 준다 (예: "h-4 w-1/2")
export const Bone = ({ className = '' }: BoneProps) => (
  <div aria-hidden className={`skeleton rounded-md ${className}`} />
);

const Status = ({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) => (
  <div role="status" aria-busy className={className}>
    <span className="sr-only">{label}</span>
    {children}
  </div>
);

// 줄 길이를 조금씩 달리해 글 문단처럼 보이게 한다
const LINE_WIDTHS = ['w-full', 'w-5/6', 'w-2/3', 'w-3/4'];

type SkeletonLinesProps = {
  label: string;
  lines?: number;
};

// 카드 안 작은 자리(목록 몇 줄, 설정 칸)
export const SkeletonLines = ({ label, lines = 3 }: SkeletonLinesProps) => (
  <Status label={label} className="flex flex-col gap-3">
    {Array.from({ length: lines }, (_, i) => (
      <Bone key={i} className={`h-4 ${LINE_WIDTHS[i % LINE_WIDTHS.length]}`} />
    ))}
  </Status>
);

type SkeletonTableProps = {
  label: string;
  rows?: number;
  cols?: number;
  // 카드 안에 이미 들어 있는 표면 false (대시보드 카드 등)
  card?: boolean;
};

// table.ts 의 표 모양 그대로: 둥근 회색 머리줄 + 흰색·연회색 줄무늬
const TableBones = ({ rows, cols }: { rows: number; cols: number }) => (
  <>
    <div className="flex h-11 items-center gap-6 rounded-md bg-bg-subtle px-4">
      {Array.from({ length: cols }, (_, c) => (
        <Bone key={c} className={`h-3 ${c === 0 ? 'w-24' : 'w-16'}`} />
      ))}
    </div>
    {Array.from({ length: rows }, (_, r) => (
      <div key={r} className="flex h-12 items-center gap-6 rounded-md px-4 even:bg-bg-page">
        {Array.from({ length: cols }, (_, c) => (
          <Bone
            key={c}
            className={`h-4 ${c === 0 ? (r % 2 ? 'w-32' : 'w-40') : r % 3 ? 'w-16' : 'w-12'}`}
          />
        ))}
      </div>
    ))}
  </>
);

export const SkeletonTable = ({ label, rows = 6, cols = 5, card = true }: SkeletonTableProps) => (
  <Status label={label} className={card ? TABLE_CARD : undefined}>
    <TableBones rows={rows} cols={cols} />
  </Status>
);

type SkeletonListProps = {
  label: string;
  rows?: number;
};

// 카드 목록 (폰 내 요청·브리핑, 활동 기록) — 줄마다 제목·칩·보조 문구
export const SkeletonList = ({ label, rows = 4 }: SkeletonListProps) => (
  <Status label={label} className="flex flex-col gap-3">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex items-center gap-4 rounded-xl bg-bg-surface p-5 shadow-card">
        <div className="flex flex-1 flex-col gap-2">
          <Bone className="h-3 w-20" />
          <Bone className={`h-5 ${i % 2 ? 'w-1/2' : 'w-2/3'}`} />
          <Bone className="h-6 w-24 rounded-full" />
        </div>
        <Bone className="size-9 rounded-full" />
      </div>
    ))}
  </Status>
);

type SkeletonDetailProps = {
  label: string;
  layout: 'mobile' | 'desk';
};

// 상세 화면(검토·부품): 머리(입구·제목·칩) + 카드들. PC 는 가운데 본문 2칸 + 오른쪽 패널 1칸
export const SkeletonDetail = ({ label, layout }: SkeletonDetailProps) => {
  const card = (key: number, tall = false) => (
    <div key={key} className="flex flex-col gap-4 rounded-xl bg-bg-surface p-6 shadow-card">
      <Bone className="h-6 w-1/3" />
      <Bone className="h-4 w-full" />
      <Bone className="h-4 w-5/6" />
      {tall ? <Bone className="h-40 w-full" /> : <Bone className="h-4 w-2/3" />}
    </div>
  );
  return (
    <Status label={label} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {layout === 'desk' ? <Bone className="h-10 w-64 rounded-full" /> : null}
        <Bone className="h-3 w-24" />
        <Bone className={layout === 'desk' ? 'h-10 w-80' : 'h-8 w-2/3'} />
        <div className="flex gap-2">
          <Bone className="h-6 w-20 rounded-full" />
          <Bone className="h-6 w-12 rounded-full" />
        </div>
      </div>
      {layout === 'desk' ? (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 flex flex-col gap-6">{[card(0), card(1, true)]}</div>
          <div className="flex flex-col gap-6">{[card(2), card(3)]}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">{[card(0), card(1), card(2)]}</div>
      )}
    </Status>
  );
};

type SkeletonCardsProps = {
  label: string;
  count?: number;
};

// 화면 맨 처음(Suspense fallback): 제목줄 + 필터 알약 + 표 카드. 어떤 목록 화면이든 대략 이 모양이다
export const SkeletonPage = ({ label }: { label: string }) => (
  <Status label={label} className="flex flex-col gap-6">
    <div className="flex flex-col gap-2">
      <Bone className="h-9 w-48" />
      <Bone className="h-4 w-80" />
    </div>
    <div className="flex gap-2">
      <Bone className="h-10 w-24 rounded-full" />
      <Bone className="h-10 w-20 rounded-full" />
      <Bone className="h-10 w-28 rounded-full" />
    </div>
    <div className={TABLE_CARD}>
      <TableBones rows={6} cols={5} />
    </div>
  </Status>
);

// 카드 안의 테두리 상자 목록 (실사 요청, 체크 근거처럼 상자가 쌓이는 자리)
export const SkeletonCards = ({ label, count = 3 }: SkeletonCardsProps) => (
  <Status label={label} className="flex flex-col gap-3">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="flex flex-col gap-3 rounded-md border border-border-default p-4">
        <Bone className="h-4 w-1/3" />
        <Bone className="h-4 w-full" />
      </div>
    ))}
  </Status>
);
