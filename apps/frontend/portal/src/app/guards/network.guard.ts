import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { NetworksService } from '../_services/networks.service';
import { combineLatest, filter, firstValueFrom, map } from 'rxjs';

export const networkGuard = async () => {
    const router = inject(Router);
    const networksService = inject(NetworksService);

    // Wait for loading to finish, then check for a selected network
    const selected = await firstValueFrom(
        combineLatest([networksService.isLoading$, networksService.selectedNetwork$]).pipe(
            filter(([loading]) => !loading),
            map(([, selectedNetwork]) => selectedNetwork),
        ),
    );

    if (!selected) {
        return router.createUrlTree(['/no-network']);
    }

    return true;
};
