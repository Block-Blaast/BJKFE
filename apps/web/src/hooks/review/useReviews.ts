import { useQuery } from '@tanstack/react-query';

import { reviewQueries } from '@bjk/api/reviews';
import type { ReviewListFilters } from '@bjk/api/types/review';

export const useReviews = (filters: ReviewListFilters) => useQuery(reviewQueries.list(filters));
