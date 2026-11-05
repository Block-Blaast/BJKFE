import { useMutation, useQueryClient } from '@tanstack/react-query';

import { confirmPending, sendChatMessage } from '@bjk/api/chat';
import { queryKeys } from '@bjk/api/queryKeys';

// 시연용: 작업자가 채팅으로 "○○ 10개 들어왔어요"를 기록하는 흐름을 그대로 탄다 (F-CHAT-01 → 확인 → 원장 IN).
// 3D 창고에서 입고 장면을 보여줄 때만 쓴다. 실제 입고는 폰 채팅(M-02)에서 한다.
export const useRecordReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      const turn = await sendChatMessage({ client_message_id: crypto.randomUUID(), text });
      // 부품 고르기(select)·수량 경고(warning)·실사(count) 카드는 사람이 봐야 하므로 바로 확정하지 않는다
      if (turn.card?.type !== 'confirm') throw new Error(turn.reply);
      return confirmPending(turn.card.pending_id);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.parts.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.twin.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
      ]),
  });
};
