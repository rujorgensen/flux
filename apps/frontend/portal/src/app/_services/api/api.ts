import { treaty } from '@elysiajs/eden';
import type { TApp } from '../../../../../../../apps/backend/portal/src/main.ts';
import { apiBaseUrl } from './api-base';

export const api = treaty<TApp>(
    apiBaseUrl,
    {
        // Automatically parse date string to Date object.
        parseDate: true,

        // Include cookies in requests.
        fetch: {
            credentials: 'include',
        },
    },
);
