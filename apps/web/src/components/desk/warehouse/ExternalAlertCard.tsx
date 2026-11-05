'use client';

import { AlertTriangle, ChevronRight, Sparkles, TrendingUp, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import Button from '@bjk/ui/components/Button';

import Tag from '@/components/ui/Tag';
import { useExternalAlerts } from '@/hooks/external/useExternalAlerts';
import { useTwinLayout } from '@/hooks/twin/useTwinLayout';
import { useWarehouseBridge } from '@/hooks/twin/useWarehouseBridge';
import { formatNumber } from '@/utils/format';
import { locsByPart } from '@/utils/twin';

const HIGHLIGHT_LABEL = '외부 요인 영향';

// 외부 요인 알림 (F-EXT, [추가]) — 환율·해상운임이 급변하면 3D 오른쪽 아래에 뜬다(FLOATING_SLOTS).
// 문장은 서버(AI)가 쓴 요약을 그대로 보여 준다. "영향 부품 보기"는 해당 칸을 3D 에서 비추고, 결정 대기 검토가 있으면 바로 연다.
// 닫은 알림은 이 화면에서만 숨긴다(서버에 읽음을 보내는 계약은 아직 없다).
const ExternalAlertCard = () => {
  const alerts = useExternalAlerts();
  const layout = useTwinLayout();
  const bridge = useWarehouseBridge();
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  const alert = alerts.data?.find((a) => !dismissed.has(a.id));
  if (!alert) return null;

  const locsOf = layout.data ? locsByPart(layout.data.placements) : null;
  const locs = locsOf ? alert.affected_part_ids.flatMap((id) => locsOf.get(id) ?? []) : [];
  const reviews = alert.related_review_ids;
  const { indicator } = alert;
  const sign = indicator.change_pct > 0 ? '+' : '';

  return (
    <section
      role="alert"
      aria-labelledby={`${alert.id}-title`}
      className="flex w-96 flex-col gap-3 rounded-xl bg-bg-surface p-5 shadow-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={alert.level === '높음' ? 'danger' : 'warning'} icon={AlertTriangle}>
            {alert.factor} {alert.level}
          </Tag>
          <Tag tone="brand" icon={Sparkles}>
            AI 요약
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
          {indicator.label} {formatNumber(indicator.value)}
          {indicator.unit} · {indicator.period} {sign}
          {indicator.change_pct}%
        </p>
      </div>

      <p className="text-body-sm text-text-body">{alert.message}</p>

      <div className="flex flex-wrap gap-2">
        <Button disabled={!locs.length} onClick={() => bridge.focus(locs, HIGHLIGHT_LABEL)}>
          영향 부품 {alert.affected_part_ids.length}개 보기
        </Button>
        {reviews.length ? (
          <Link
            href={reviews.length === 1 ? `/reviews/${reviews[0]}` : '/reviews'}
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
