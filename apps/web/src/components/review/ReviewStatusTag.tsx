import {
  CircleCheck,
  CirclePause,
  CircleSlash,
  Clock,
  Loader,
  PackageCheck,
  PackageOpen,
  TimerOff,
  type LucideIcon,
} from 'lucide-react';

import type { ReviewStatus } from '@bjk/api/domain/review';

import Tag, { type TagTone } from '@/components/ui/Tag';

// 상태 전이 (F-APPROVAL-02). 라벨은 상태 이름 그대로 쓰되 '검토완료'는 사용자 입장의 '결정 대기'로 보여준다.
const STATUS_TAG: Record<ReviewStatus, { tone: TagTone; icon: LucideIcon; label: string }> = {
  검토중: { tone: 'neutral', icon: Loader, label: '검토중' },
  보류: { tone: 'warning', icon: CirclePause, label: '보류' },
  검토완료: { tone: 'brand', icon: Clock, label: '결정 대기' },
  발주됨: { tone: 'success', icon: PackageCheck, label: '발주됨' },
  부분입고: { tone: 'warning', icon: PackageOpen, label: '부분입고' },
  입고완료: { tone: 'success', icon: CircleCheck, label: '입고완료' },
  종료: { tone: 'neutral', icon: CircleSlash, label: '종료' },
  만료: { tone: 'neutral', icon: TimerOff, label: '만료' },
};

const ReviewStatusTag = ({ status }: { status: ReviewStatus }) => {
  const { tone, icon, label } = STATUS_TAG[status];
  return (
    <Tag tone={tone} icon={icon}>
      {label}
    </Tag>
  );
};

export default ReviewStatusTag;
