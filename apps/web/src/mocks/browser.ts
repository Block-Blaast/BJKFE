import { setupWorker } from 'msw/browser';

import { handlers } from '@bjk/api/mocks';

export const worker = setupWorker(...handlers);
