import { useQuery } from '@tanstack/react-query';

import { reviewQueries } from '@bjk/api/reviews';

export const useReview = (id: string) => useQuery(reviewQueries.detail(id));

export const useReviewForecast = (id: string) => useQuery(reviewQueries.forecast(id));
