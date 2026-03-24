import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { createAuthClient } from 'better-auth/client';

export const authGuard = async () => {
    const router = inject(Router);
    const authClient = createAuthClient({
        baseURL: typeof window !== 'undefined' && window.location.hostname === 'localhost'
            ? 'http://localhost:3000'
            : undefined,
    });

    try {
        const session = await authClient.getSession();

        if (!session.data?.session) {
            return router.createUrlTree(['/sign-in']);
        }

        return true;
    } catch {
        return router.createUrlTree(['/sign-in']);
    }
};
