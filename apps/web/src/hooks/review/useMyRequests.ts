import { useQuery } from '@tanstack/react-query';

import { reviewQueries } from '@bjk/api/reviews';

export const useMyRequests = () => useQuery(reviewQueries.mine());
