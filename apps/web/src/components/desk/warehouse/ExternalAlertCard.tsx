'use client';

import { AlertTriangle, ChevronRight, Gauge, TrendingUp, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import Button from '@bjk/ui/components/Button';

import Tag from '@/components/ui/Tag';
import { useExternalAlerts } from '@/hooks/external/useExternalAlerts';
import { useParts } from '@/hooks/part/useParts';
import { useReviews } from '@/hooks/review/useReviews';
import { useTwinLayout } from '@/hooks/twin/useTwinLayout';
import { useWarehouseBridge } from '@/hooks/twin/useWarehouseBridge';
import { formatNumber } from '@/utils/format';
import { locsByPart } from '@/utils/twin';

const HIGHLIGHT_LABEL = '외부 요인 영향';

// 외부 요인 알림 (F-EXT) — 백엔드 외부 요인 현황(DSH-03)에서 환율·해상운임이 주의·높음이면 3D 오른쪽 아래에 뜬다.
// 영향 부품은 위험도가 오른 분류의 부품, 결정 대기는 그 부품의 검토다. "영향 부품 보기"는 해당 칸을 3D 에서 비춘다.
// 닫은 알림은 이 화면에서만 숨긴다(서버에 읽음을 보내는 계약은 없다).
const ExternalAlertCard = () => {
  const alerts = useExternalAlerts();
  const layout = useTwinLayout();
  const parts = useParts({});
  const pending = useReviews({ status: 'pending' });
  const bridge = useWarehouseBridge();
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  const alert = alerts.data?.find((a) => !dismissed.has(a.id));
  if (!alert) return null;

  const categories = new Set(alert.categories);
  const affected = (parts.data ?? []).filter((p) => p.category && categories.has(p.category));
  const affectedIds = new Set(affected.map((p) => p.id));
  const reviews = (pending.data ?? []).filter((r) => affectedIds.has(r.part.id));
  const locsOf = layout.data ? locsByPart(layout.data.placements) : null;
  const locs = locsOf ? affected.flatMap((p) => locsOf.get(p.id) ?? []) : [];
  const { indicator } = alert;

  return (
    <section
      role="alert"
      aria-labelledby={`${alert.id}-title`}
      className="flex w-96 flex-col gap-3 rounded-xl bg-bg-surface p-5 shadow-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={alert.level === '높음' ? 'danger' : 'warning'} icon={AlertTriangle}>
            외부 요인 {alert.level}
          </Tag>
          <Tag tone="brand" icon={Gauge}>
            새벽 분석
          </Tag>
        </div>
        <button
          type="button"
          onClick={() => setDismissed((s) => new Set(s).add(alert.id))}
          aria-label="알림 닫기"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-body transition-colors hover:bg-bg-brand-subtle hover:text-text-brand"
        >
          <X size={16} aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <h2 id={`${alert.id}-title`} className="text-h3 text-text-heading">
          {alert.title}
        </h2>
        <p className="flex items-center gap-1 text-label-md text-text-danger tabular-nums">
          <TrendingUp size={16} aria-hidden />
          {indicator.name} {formatNumber(indicator.value)}
          {indicator.z === null ? null : ` · 평소 대비 z ${Math.round(indicator.z * 10) / 10}`}
        </p>
      </div>

      <p className="text-body-sm text-text-body">{alert.message}</p>

      <div className="flex flex-wrap gap-2">
        <Button disabled={!locs.length} onClick={() => bridge.focus(locs, HIGHLIGHT_LABEL)}>
          영향 부품 {affected.length}개 보기
        </Button>
        {reviews.length ? (
          <Link
            href={reviews.length === 1 ? `/reviews/${reviews[0].id}` : '/reviews'}
            className="inline-flex items-center gap-1 rounded-full bg-bg-brand-subtle px-5 py-3 text-label-md text-text-brand transition-colors hover:bg-bg-brand-subtle-hover"
          >
            결정 대기 {reviews.length}건
            <ChevronRight size={16} aria-hidden />
          </Link>
        ) : null}
      </div>
    </section>
  );
};

export default ExternalAlertCard;
