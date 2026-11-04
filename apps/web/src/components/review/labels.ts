import type { Review } from '@bjk/api/types/review';

const REQUESTER_LABEL: Record<Review['requester'], string> = {
  worker: '작업자 요청',
  manager: '관리자 요청',
  owner: '사장님 요청',
  system: '시스템 초안',
};

// 검토에 들어온 입구 (F-NOTI-01). 사람이 올린 요청은 누가 올렸는지, 시스템 초안은 어디서 왔는지 보여준다.
export const entryLabelOf = (review: Pick<Review, 'origin' | 'requester'>) => {
  if (review.origin === 'missed_scan') return '놓친 발주 (아침 스캔)';
  if (review.origin === 'stock_draft') return '재고 부족 초안';
  return REQUESTER_LABEL[review.requester];
};
