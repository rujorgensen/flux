import * as Bun from 'bun';
import * as nodeURL from 'node:url';
import { TNetworkId_S } from '@flux/shared';
import { generateToken } from '../../auth/auth';

export const authorizeNetworkAuthority = async (request: Bun.BunRequest) => {
    // Find the network authority to authenticate with
    const networkId: TNetworkId_S = nodeURL.parse(request.url, true).query
        .networkId as TNetworkId_S;

    if (!networkId) {
        return new Response('Missing networkId', { status: 500 });
    }

    const text = await request.text();

    console.log('Received password:', text, networkId);

    console.error('TODOD: CHECK PASSWORD');

    const cookies = request.cookies;

    // Set a cookie with various options
    cookies.set('user_id', '12345', {
        maxAge: 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        secure: true,
        path: '/',
    });

    return new Response(
        generateToken({
            networkId,
            isAuthority: true,
        }),
        {
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*',
                'Set-Cookie': `sessionId=abc123; HttpOnly; Max-Age=3600`,
            },
        }
    );
};
