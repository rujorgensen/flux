import jwt from '@elysiajs/jwt';
import Elysia from 'elysia';
import { readUsageHistory } from './history/usage-history.route';
import { getPortalPgRepository } from '../repository/prisma';

export const api = new Elysia()
    .use(
        jwt({
            name: 'jwt',
            secret: 'Fischl von Luftschloss Narfidort'
        })
    )
    .derive(async ({ cookie: { auth }, jwt }) => {
        const payload = await jwt.verify(auth?.value);

        if (!payload) {
            throw new Error('Unauthorized');
        }

        return {
            user: payload,
        };
    })
    .group(
        '/api',
        //   {
        //       async beforeHandle({ jwt, query, cookie: { auth }, body, redirect }) {
        //           console.log('BODY', { pass: body.password });
        // 
        //           // Check if the user is already authenticated
        //           const value = await jwt.sign({ token: query.token as string })
        // 
        //           // const payload = await jwt.verify(auth);
        //           // if (!payload) {
        //           //     set.status = 401;
        //           //     return 'Unauthorized';
        //           // }
        //       },
        //   },
        (app) => app
            .get('/api/ping', () => 'pong')
            .get('/api/connected-authorities', () => 9999)
            .get('/api/networks/:networkId/usage?from=:date&to=:date', ({ networkId, from, to }) => {
                return readUsageHistory(getPortalPgRepository())(
                    networkId,
                    {
                        from,
                        to,
                    });
            }),
    );
