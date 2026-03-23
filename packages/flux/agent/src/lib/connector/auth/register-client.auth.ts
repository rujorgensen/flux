import {
    type TAuthenticationTicket,
    type TAgentOwnUId,
    type TNetworkId_S,
    checkAuthTicketShape,
} from '@flux/shared/types';
import { encrypt } from '../../utils/obscuring/encyprt.utils';
import {
    type TFluxClientUID,
    validateMachineUID,
} from '@flux/shared/utils';

/**
 * Authenticates with the server and returns a ticket for connecting the websocket.
 * 
 * This client -> flux server -> authority client -> flux server -> this client.
 * 
 * @param { TNetworkId_S } networkId - The network ID to connect to
 * @param { string } domain - The domain of the authority server
 * @param { unknown } unknownIdentificationPayload - The payload to send to the authority server
 * @param { object } clientInfo - Optional client identification info
 * @param { string } [password] - Optional password for encrypting the payload
 * 
 * @returns { Promise<TAuthenticationTicket> } The authentication ticket for connecting the websocket
 */
export const authenticateAgentOrThrow = async (
    networkId: TNetworkId_S,
    domain: string,
    unknownIdentificationPayload: unknown,
    clientInfo: {
        clientUId?: TAgentOwnUId,
        machineUID?: TFluxClientUID,
    },
    password?: string,
): Promise<TAuthenticationTicket> => {

    // * 1. Encrypt the payload, if a password is defined
    if ((unknownIdentificationPayload === undefined) || (unknownIdentificationPayload === null)) {
        throw new Error('Custom payload is required');
    }

    let customPayload: string | undefined;

    if (typeof unknownIdentificationPayload === 'string') {
        customPayload = unknownIdentificationPayload;
    }

    if (typeof unknownIdentificationPayload === 'object') {
        try {
            customPayload = JSON.stringify(unknownIdentificationPayload);
        } catch {
            throw new Error('Custom payload must be serializable');
        }
    }

    if (customPayload === undefined) {
        throw new Error('Custom payload must be a string or serializable object');
    }

    // * 2. Encrypt the payload, if a password is provided
    if (password !== undefined) {
        customPayload = JSON.stringify(await encrypt(customPayload, password));
    }

    // * 3. Send the payload to the authority server and wait for the response
    const url = new URL(`${domain}/auth/network-client`);
    url.searchParams.set('networkId', networkId);
    if (clientInfo.clientUId) {
        url.searchParams.set('requestedAgentUid', clientInfo.clientUId);
    }
    if (clientInfo.machineUID && validateMachineUID(clientInfo.machineUID)) {
        url.searchParams.set('machineUID', clientInfo.machineUID);
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
            'x-flux-content-type': typeof unknownIdentificationPayload === 'string' ?
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