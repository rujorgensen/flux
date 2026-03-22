import type * as Bun from 'bun';
import * as nodeURL from 'node:url';
import { PicoLogger } from '@utils/pico-logger';
import { generateToken } from '../../auth/auth';
import {
    type TNetworkId_S,
    validateNetworkIdOrThrow,
} from '@flux/shared/types';
import {
    type TFluxClientUID,
    validateMachineUID,
} from '@flux/shared/utils';

/**
 * This route is used to authorize a network authority.
 */
export const authorizeNetworkAuthority = async (
    request: Bun.BunRequest,
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
    const text = await request.text();

    PicoLogger.log(`Received password:${text}${networkId}`, 'authorize');

    console.error('TODOD: CHECK PASSWORD');

    const cookies = request.cookies;

    // Set a cookie with various options
    cookies.set('user_id', '12345', {
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
            isAuthority: true,
            machineUID: machineUID,
        }),
        {
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*',
                'Set-Cookie': 'sessionId=abc123; HttpOnly; Max-Age=3600',
            },
        }
    );
};
