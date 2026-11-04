import { useQuery } from '@tanstack/react-query';

import { authQueries } from '@bjk/api/auth';

export const useCompanyMembers = (companyCode: string) =>
  useQuery(authQueries.members(companyCode));

export const useInvite = (token: string) => useQuery(authQueries.invite(token));
