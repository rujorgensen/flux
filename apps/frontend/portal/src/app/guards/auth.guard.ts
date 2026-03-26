import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../_services/auth/user.service';

export const authGuard = async () => {
    const router = inject(Router);
    const authClient = inject(UserService);

    try {
        const session = await authClient
            .authClient
            .getSession();

        if (!session.data?.session) {
            return router.createUrlTree(['/sign-in']);
        }

        return true;
    } catch {
        return router.createUrlTree(['/sign-in']);
    }
};
