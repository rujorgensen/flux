import type {
    TNetworkId_S,
} from '@flux/shared/types';
import type { TFluxClientUID } from '@flux/shared/utils';
import { validateMachineUID } from 'libs/flux/shared/utils/src/lib/machine-id.util';

export class RetryableError extends Error { }
export class ConnectionError extends RetryableError { }

/**
 * Authenticates with the server and returns a ticket for connecting the websocket.
 */
export const authenticateNetworkAuthorityOrThrow = async (
    networkId: TNetworkId_S,
    domain: string,
    authorityKey: string,
    clientInfo: {
        machineUID?: TFluxClientUID,
    },
): Promise<unknown> => {

    // * 1. Send the payload to the authority server and wait for the response
    try {
        const url = new URL(`${domain}/auth/network-authority`);
        url.searchParams.set('networkId', networkId);
        if (clientInfo.machineUID && validateMachineUID(clientInfo.machineUID)) {
            url.searchParams.set('machineUID', clientInfo.machineUID);
        }

        const response = await fetch(url, {
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