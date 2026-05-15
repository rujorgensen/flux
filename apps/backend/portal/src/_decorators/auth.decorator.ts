import Elysia from 'elysia';
import {
    auth,
    isMasterPasswordLoginEnabled,
    MASTER_PASSWORD_ADMIN_EMAIL,
} from '@backend/portal/auth';

// user middleware (compute user and session and pass to routes)
export const betterAuth = new Elysia({ name: 'better-auth' })
    .get('/api/auth/config', () => ({
        isMasterPasswordLoginEnabled,
        masterPasswordAdminEmail: isMasterPasswordLoginEnabled
            ? MASTER_PASSWORD_ADMIN_EMAIL
            : null,
    }))
    .get('/api/auth/*', ({ request }) => auth.handler(request))
    .post('/api/auth/*', ({ request }) => auth.handler(request))

    .macro({
        auth: {
            async resolve({ status, request: { headers } }) {
                const session = await auth.api.getSession({
                    headers,
                });

                if (!session) {
                    return status(401);
                }

                return {
                    user: session.user,
                    session: session.session,
                };
            },
        },
    });
