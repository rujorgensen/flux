import type { BunRequest } from 'bun';
import * as nodeURL from 'node:url';
import {
    type TAddress,
    type TNetworkId_S,
    GlobalRPCTimeoutError,
    UnknownClientError,
    validateAgentUIDOrThrow,
    validateNetworkIdOrThrow,
    NetworkAuthorityNotFoundError,
} from '@flux/shared/types';
import { generateToken } from '../../auth/auth';
import type { GlobalRPCClient } from '../../routing/rpc/core/global-rpc-client.class';
import type { NetworkAuthorityRedisCache } from '../../register/network-authority-redis-cache.class';
import { retryOrThrow } from '@flux/shared/utils';
import {
    type TFluxClientUID,
    validateMachineUID,
} from '@flux/shared/utils';

/**
 * This route is used to authorize an agent connection.
 * 
 * @param { BunRequest } request - The incoming HTTP request
 * @param { NetworkAuthorityRedisCache } networkAuthorityManager - The network authority manager
 * @param { GlobalRPCClient<'authorizeAgentConnection'> } globalRPCClient - The global RPC client
 * 
 * @returns { Promise<Response> } The HTTP response with auth token or error
 */
export const authorizeAgentConnection = async (
    request: BunRequest,
    networkAuthorityManager: NetworkAuthorityRedisCache,
    globalRPCClient: GlobalRPCClient<'authorizeAgentConnection'>,
) => {
    const urlWithParsedQuery: nodeURL.UrlWithParsedQuery = nodeURL.parse(request.url, true);

    // Find the network authority to authenticate with
    const networkIdString: string | string[] | undefined = urlWithParsedQuery.query['networkId'];

    try {
        validateNetworkIdOrThrow(networkIdString ?? '');
    } catch (error) {
        return new Response(
            error instanceof Error ? error.message : 'Unknown error validating network ID',
            {
                status: 500,
            },
        );
    }
    const networkId: TNetworkId_S = networkIdString as TNetworkId_S;

    if (!networkId) {
        return new Response('Missing networkId', {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        });
    }

    const text = await request.text();

    const contentType = request.headers
        .get('x-flux-content-type')
        ?.toLowerCase();

    try {
        let networkAuthorityAddress: TAddress;

        const authorizedJWT: string = await retryOrThrow<string>(
            async () => {
                networkAuthorityAddress = await networkAuthorityManager
                    .resolveNetworkAuthorityAddressOrThrow(
                        networkId,
                    );

                return globalRPCClient.call(
                    networkAuthorityAddress,
                    'authorizeAgentConnection',
                    `${contentType === 'application/json' ? 'json' : 'text'}:${text}`
                );
            },
            (error: unknown) => {
                if (
                    (error instanceof UnknownClientError) ||
                    (error instanceof GlobalRPCTimeoutError)
                ) {
                    networkAuthorityManager.removeUnresponsiveClient(
                        networkId,
                        networkAuthorityAddress,
                    );

                    return true;
                }

                return false;
            },
            {
                retries: 10,
                delayMs: 50,
                onRetry: (
                    attempt: number,
                    retries: number,
                ) => {
                    console.log(`[authorizeAgentConnection] Retrying... (attempt: ${attempt} of ${retries})`);
                },
            },
        );

        // const authorizedJWT: string = await globalRPCClient.call(
        //     networkAuthorityAddress,
        //     'authorizeAgentConnection',
        //     `${contentType === 'application/json' ? 'json' : 'text'}:${text}`
        // );

        if (authorizedJWT) {
            const requestedAgentUidString: string | string[] | undefined = urlWithParsedQuery.query['requestedAgentUid'];

            if (requestedAgentUidString) {
                try {
                    validateAgentUIDOrThrow(requestedAgentUidString);
                } catch (error) {
                    return new Response(
                        error instanceof Error ? error.message : 'The requested agent ID is not valid',
                        {
                            status: 500,
                        },
                    );
                }
            }

            const cookies = request.cookies;

            // Set a cookie with various options
            cookies.set('claim', authorizedJWT, {
                maxAge: 60 * 60 * 24 * 7, // 1 week
                httpOnly: true,
                secure: true,
                path: '/',
            });

            const machineUIDString: string | string[] | undefined = urlWithParsedQuery.query['machineUID'];
            let machineUID: TFluxClientUID | undefined;
            if (machineUIDString && validateMachineUID(machineUIDString)) {
                machineUID = machineUIDString;
            }

            return new Response(
                generateToken({
                    networkId,
                    claim: authorizedJWT,
                    agentUID: requestedAgentUidString as string,
                    machineUID: machineUID,
                }),
                {
                    headers: {
                        'Content-Type': 'text/plain',
                        'Access-Control-Allow-Origin': '*',
                        //   'Set-Cookie': `sessionId=abc123; HttpOnly; Max-Age=3600; signed=true; Path=/;`,
                    },
                }
            );
        }
    } catch (error) {
        console.error('Error authorizing:', error instanceof Error ? error.message : error);

        if (error instanceof NetworkAuthorityNotFoundError) {
            return new Response(error.message, {
                status: 401, // 401 'Unauthorized'
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }
    }

    return new Response('Unauthorized', {
        status: 500, // 500 'Internal error'
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    });
};
