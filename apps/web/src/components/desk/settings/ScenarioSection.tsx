'use client';

import Button from '@bjk/ui/components/Button';

import { useScenarios, useSetExternalShock } from '@/hooks/scenario/useScenarios';
import { apiErrorMessage, apiErrorStatus } from '@/utils/apiError';

// 운영 시연 시나리오 (BJK-AI-BE #303). 실제 환율·해상운임이 정상이면 외부 요인 화면이 비어 있어,
// 시연 때 사장님이 해상운임 급등을 켜 3D 창고 알림·검토 C-09·외부 요인 칸을 보여 준다.
const SHOCK_HELP =
  '켜면 해상운임 위험도를 3(높음)으로 두고 부품 지표를 바로 다시 계산해요. 3D 창고에 외부 요인 알림이 뜨고, 이후 새로 만든 검토부터 외부 리스크(C-09)가 걸려요. 끄면 실제 값으로 돌아가요.';

const ScenarioSection = () => {
  const state = useScenarios();
  const toggle = useSetExternalShock();

  if (state.isPending) {
    return <p className="text-body-md text-text-secondary">불러오는 중이에요…</p>;
  }
  if (state.isError) {
    return (
      <p className="text-body-md text-text-secondary">
        {apiErrorStatus(state.error) === 403
          ? '사장님만 시연 시나리오를 바꿀 수 있어요.'
          : '시연 시나리오를 불러오지 못했어요.'}
      </p>
    );
  }

  const on = state.data.external_shock;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-label-lg text-text-heading">해상운임 급등 (외부 충격)</h3>
          <p className="text-body-sm text-text-secondary">{SHOCK_HELP}</p>
        </div>
        <Button
          variant={on ? 'secondary' : 'primary'}
          disabled={toggle.isPending}
          onClick={() => toggle.mutate(!on)}
        >
          {toggle.isPending ? '다시 계산하는 중…' : on ? '끄기' : '켜기'}
        </Button>
      </div>
      <p className="text-label-md text-text-body">지금: {on ? '켜짐' : '꺼짐'}</p>
      {toggle.isError ? (
        <p className="text-body-sm text-text-danger">
          {apiErrorMessage(toggle.error, '바꾸지 못했어요. 잠시 후 다시 시도해 주세요.')}
        </p>
      ) : null}
    </div>
  );
};

export default ScenarioSection;
