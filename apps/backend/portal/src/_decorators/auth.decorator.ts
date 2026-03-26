import Elysia, { type Context } from 'elysia';
import { auth } from '@backend/portal/auth';

// user middleware (compute user and session and pass to routes)
export const betterAuth = new Elysia({ name: 'better-auth' })
    .all('/api/auth/*', (context: Context) => {
        if (['POST', 'GET'].includes(context.request.method)) {
            return auth.handler(context.request);
        }

        context.status(405);

        return undefined;
    })

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
