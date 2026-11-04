import { useQuery } from '@tanstack/react-query';

import { reviewQueries } from '@bjk/api/reviews';

export const useReview = (id: string) => useQuery(reviewQueries.detail(id));
