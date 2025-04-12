import {
    type TAuthenticationTicket,
    TNetworkId_S,
    checkAuthTicketShape,
} from '@flux/shared';
import { encrypt } from '../../utils/obscuring/encyprt.utils';

/**
 * Authenticaktes with the server and returns a ticket for connecting the websocket.
 * 
 * This client -> flux server -> authority client -> flux server -> this client.
 * 
 * @param { string }    domain The domain of the authority server.
 * @param { unknown }   customPayload The payload to send to the authority server.
 * 
 * @returns { Promise<TAuthenticationTicket> }
 */
export const authenticateOrThrow = async (
    networkId: TNetworkId_S,
    domain: string,
    unknownCustomPayload: unknown,
    password?: string,
): Promise<TAuthenticationTicket> => {

    // * 1. Encrypt the payload, if a password is defined
    if ((unknownCustomPayload === undefined) || (unknownCustomPayload === null)) {
        throw new Error('Custom payload is required');
    }

    let customPayload: string | undefined;

    if (typeof unknownCustomPayload === 'string') {
        customPayload = unknownCustomPayload;
    }

    if (typeof unknownCustomPayload === 'object') {
        try {
            customPayload = JSON.stringify(unknownCustomPayload);
        } catch {
            throw new Error('Custom payload must be serializable');
        }
    }

    if (customPayload === undefined) {
        throw new Error('Custom payload must be a string or serializable object');
    }

    // * 2. Encrypt the payload, if a password is defined
    if (password) {
        customPayload = JSON.stringify(await encrypt(customPayload, password));
    }

    // * 3. Send the payload to the authority server and wait for the response
    const response = await fetch(`${domain}/auth/network-client?networkId=${networkId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
            'x-flux-content-type': typeof unknownCustomPayload === 'string' ?
                'text/plain' :
                'application/json',
            'Accept': 'text/plain',
        },
        body: customPayload,
    });

    if (!response.ok) {
        throw new Error(`Auth failed: ${response.status}`);
    }

    const result = await response.text();

    if (!checkAuthTicketShape(result)) {
        throw new Error('Auth failed: unexpected response');
    }

    return result;
};