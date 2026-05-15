import type * as Bun from 'bun';
import * as nodeURL from 'node:url';
import { PicoLogger } from '@utils/pico-logger';
import { generateToken } from '../../auth/auth';
import {
    type TNetworkId_S,
    type TNetworkToken_S,
    validateNetworkIdOrThrow,
} from '@flux/shared/types';
import {
    type TFluxClientUID,
    validateMachineUID,
} from '@flux/shared/utils';
import { getNetworkTokenServiceInstance, NetworkTokenCache } from '@backend/features/network';
import { getMeshRedisConnection } from '../../routing/redis/redis-connection.class';

// Lazy singleton — instantiated on the first request so that getMeshRedisConnection()
// is not called at module-load time (before the test/process sets FLUX_MESH_REDIS_URL).
let _networkTokenCache: NetworkTokenCache | undefined;

const getNetworkTokenCache = (
): NetworkTokenCache => {
    _networkTokenCache ??= new NetworkTokenCache(
        getMeshRedisConnection(),
        getNetworkTokenServiceInstance(),
    );

    return _networkTokenCache;
};

/**
 * This route is used to authorize a network authority.
 *
 * The plain-text token value sent in the request body is validated against
 * the local {@link NetworkTokenCache}. The cache is kept in sync via Redis
 * pub/sub events emitted by the portal on token creation, rotation, or
 * deletion — so no database round-trip is unless it doesn't exist locally.
 *
 * @param { Bun.BunRequest } request - The incoming HTTP request
 *
 * @returns { Promise<Response> } The HTTP response with auth token or error
 */
export const authorizeNetworkAuthority = async (
    request: Bun.BunRequest,
    hardcodedNetworkCredentials?: Map<TNetworkId_S, string>,
): Promise<Response> => {
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
    const tokenValue = await request.text();

    PicoLogger.log(`Received authority token for network: ${networkId}`, 'authorize');

    if (hardcodedNetworkCredentials?.has(networkId) && (hardcodedNetworkCredentials.get(networkId) === tokenValue)) {
        PicoLogger.log(`Successfully authorized authority for network ${networkId} using hardcoded credentials`, 'authorize');
    } else if (!await getNetworkTokenCache().isValidToken(
        networkId,
        tokenValue as TNetworkToken_S,
    )) {
        return new Response('Invalid network access token', {
            status: 401,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        });
    }

    const machineUIDString: string | string[] | undefined = urlWithParsedQuery.query['machineUID'];
    let machineUID: TFluxClientUID | undefined;
    if (machineUIDString && validateMachineUID(machineUIDString)) {
        machineUID = machineUIDString;
    }

    return new Response(
        generateToken({
            networkId,
            isAuthority: true,
            machineUID: machineUID,
        }),
        {
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*',
            },
        },
    );
};
