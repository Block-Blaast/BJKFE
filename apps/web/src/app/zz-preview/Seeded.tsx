'use client';
// 임시 미리보기 — 확인 후 삭제
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { queryKeys } from '@bjk/api/queryKeys';
import data from './data.json';
const Seeded = ({ children }: { children: ReactNode }) => {
  const [client] = useState(() => {
    const c = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    c.setQueryData(
      queryKeys.reviews.list({ status: 'pending', urgent: false, minTotal: 0 }),
      data.reviews,
    );
    c.setQueryData(queryKeys.reviews.mine(), data.mine);
    c.setQueryData(queryKeys.reviews.detail('rv-vbelt-a42'), data.review);
    c.setQueryData(queryKeys.reviews.detail('rv-bearing-6205zz'), data.review2);
    c.setQueryData(queryKeys.parts.list({}), data.parts);
    c.setQueryData(queryKeys.parts.detail('pt-bearing-6205zz'), data.part);
    c.setQueryData(queryKeys.parts.ledger('pt-bearing-6205zz'), data.ledger);
    c.setQueryData(queryKeys.audits.list({ status: 'active' }), data.audits);
    c.setQueryData(queryKeys.mergeCandidates.all, data.merge);
    c.setQueryData(queryKeys.auth.companyMembers(), data.members);
    c.setQueryData(queryKeys.company.settings(), data.settings);
    return c;
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
export default Seeded;
