import * as Bun from 'bun';
import * as nodeURL from 'node:url';
import type { TAddress, TNetworkId_S } from '@flux/shared/types';
import { generateToken } from '../../auth/auth';
import type { GlobalRPCClient } from '../../routing/rpc/core/global-rpc-client.class';
import type { NetworkAuthorityManager } from '../../register/register-network-authority.class';

export const authorizeNetworkClient = async (
    request: Bun.BunRequest,
    networkAuthorityManager: NetworkAuthorityManager,
    globalRPCClient: GlobalRPCClient<'authorize'>
) => {
    // Find the network authority to authenticate with
    const networkId: TNetworkId_S | undefined = nodeURL.parse(request.url, true)
        .query.networkId as TNetworkId_S;

    if (!networkId) {
        return new Response('Missing networkId', {
            status: 500,
            headers: {
                //   'Access-Control-Allow-Origin': '*',
            },
        });
    }

    const networkAuthorityAddress: TAddress =
        await networkAuthorityManager.resolveNetworkAuthorityAddressOrThrow(
            networkId
        );

    console.log('found networkAuthorityAddress at', networkAuthorityAddress);

    const text = await request.text();

    const contentType = request.headers
        .get('x-flux-content-type')
        ?.toLowerCase();

    const authorizedJWT: string = await globalRPCClient.call(
        networkAuthorityAddress,
        'authorize',
        `${contentType === 'application/json' ? 'json' : 'text'}:${text}`
    );

    if (authorizedJWT) {
        const cookies = request.cookies;

        // Set a cookie with various options
        cookies.set('claim', authorizedJWT, {
            maxAge: 60 * 60 * 24 * 7, // 1 week
            httpOnly: true,
            secure: true,
            path: '/',
        });

        return new Response(
            generateToken({
                networkId,
                claim: authorizedJWT,
            }),
            {
                headers: {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*',
                    //   'Set-Cookie': `sessionId=abc123; HttpOnly; Max-Age=3600; signed=true; Path=/;`,
                },
            }
        );
    } else {
        return new Response('Unauthorized', {
            status: 500,
        });
    }
};
