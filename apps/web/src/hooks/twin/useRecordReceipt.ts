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
      if (!turn.card || !('pending_id' in turn.card)) throw new Error(turn.reply);
      return confirmPending(turn.card.pending_id);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.parts.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.twin.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
      ]),
  });
};
