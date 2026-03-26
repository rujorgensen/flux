import { treaty } from '@elysiajs/eden';
import { isDevMode } from '@angular/core';
import type { TApp } from '../../../../../../../apps/backend/portal/src/main.ts';

const treatyHostName: string = isDevMode()
    ?
    'localhost:3000'
    :
    'https://persistica.io'
    ;

export const api = treaty<TApp>(
    treatyHostName,
    {
        // Automatically parse date string to Date object.
        parseDate: true,

        // Include cookies in requests.
        fetch: {
            credentials: 'include',
        },
    },
);
