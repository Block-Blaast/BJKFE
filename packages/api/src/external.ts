import { queryOptions } from '@tanstack/react-query';

import { request } from './client';
import type { RiskLevel } from './domain/part';
import { ENDPOINTS } from './endpoints';
import { queryKeys } from './queryKeys';
import type { ExternalAlert, ExternalLevel, ExternalStatus } from './types/external';

// manager 이상만 볼 수 있다(worker 는 403). 권한이 없으면 알림을 띄우지 않는다
export const getExternalStatus = () => request<ExternalStatus>(ENDPOINTS.externalStatus);

const LEVEL_LABEL: Record<ExternalLevel, RiskLevel> = {
  normal: '정상',
  caution: '주의',
  high: '높음',
};

const UNIT: Record<string, string> = { USDKRW: '원' };

// 지표 하나를 알림 한 건으로. 문장은 백엔드 값으로 화면이 만든다(백엔드는 외부 요인에 LLM 을 쓰지 않는다)
export const alertsFromStatus = (status: ExternalStatus): ExternalAlert[] =>
  status.indicators
    .filter((i) => i.level !== 'normal')
    .map((i) => {
      // 가격 요인(환율)은 r_price, 납기 요인(운임)은 r_lead 가 이 지표 때문에 오른다
      const categories = status.categories
        .filter((c) => (i.series === 'price' ? c.r_price : c.r_lead) >= 1)
        .map((c) => c.name);
      const effect =
        i.series === 'price' ? '다음 발주부터 단가가 오를 수 있어요' : '납기가 늦어질 수 있어요';
      const times = i.z === null ? '' : ` 평소 변동폭의 ${Math.round(i.z * 10) / 10}배예요.`;
      const level = LEVEL_LABEL[i.level] as ExternalAlert['level'];
      return {
        id: i.code,
        level,
        title: `${i.name} ${level === '높음' ? '급등' : '상승'}`,
        message:
          `지금 ${i.name}: ${i.value.toLocaleString('ko-KR')}${UNIT[i.code] ?? ''}.${times} ` +
          (categories.length
            ? `${categories.join(', ')} 부품은 ${effect}.`
            : `영향을 받는 부품 분류는 아직 없어요.`),
        indicator: i,
        categories,
      };
    });

// 지표는 새벽 배치가 바꾸지만, 시연 중 외부 충격 스위치(DEV-02)로 바뀔 수 있어 1분마다 다시 받는다
const POLL_MS = 60_000;

export const externalQueries = {
  status: () =>
    queryOptions({
      queryKey: queryKeys.external.status(),
      queryFn: getExternalStatus,
      refetchInterval: POLL_MS,
      retry: false,
    }),
};
