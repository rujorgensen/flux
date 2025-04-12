import {
    type TNetworkId_S,
    // TNetworkAuthorityAuthenticationTicket,
    // checkNAATTicketShape,
} from '@flux/shared';

export class RetryableError extends Error { }
export class ConnectionError extends RetryableError { }

/**
 * Authenticaktes with the server and returns a ticket for connecting the websocket.
 * 
 * 
 * @param { string }    domain The domain of the authority server.
 * @param { unknown }   customPayload The payload to send to the authority server.
 * 
 * @returns { Promise<TAuthenticationTicket> }
 */
export const authenticateNetworkAuthorityOrThrow = async (
    networkId: TNetworkId_S,
    domain: string,
    authorityKey: string,
): Promise<unknown> => {

    // * 1. Send the payload to the authority server and wait for the response
    try {
        const response = await fetch(`${domain}/auth/network-authority?networkId=${networkId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain', //  'application/json', // text/plain
                'Accept': 'text/plain',
            },
            body: authorityKey,
        });

        if (!response.ok) {
            throw new Error(`Auth failed: ${response.status}`);
        }

        const result = await response.text();
        // if (!checkNAATTicketShape(result)) {
        //     throw new Error('Auth failed: unexpected response');
        // }

        return result;
    } catch (error) {
        throw new ConnectionError((error as any).code);
    }
};