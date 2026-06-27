import { Injectable } from '@angular/core';
import {
    type Observable,
    catchError,
    from,
    map,
    of,
    shareReplay,
} from 'rxjs';
import { api } from './api/api';

@Injectable({
    providedIn: 'root',
})
export class InstanceService {
    /**
     * Whether the portal is running in self-hosted mode.
     *
     * Detected via the master-password login flag the backend exposes on
     * `/api/auth/config`. Self-hosted instances are not subject to the SaaS
     * plan limits (e.g. the network cap) and have no billing.
     */
    public readonly selfHosted$: Observable<boolean> = from(
        api.api.auth.config.get(),
    ).pipe(
        map((response) => response.data?.isMasterPasswordLoginEnabled ?? false),
        catchError((error: unknown) => {
            console.error('Failed to load instance config', error);
            return of(false);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
    );
}
