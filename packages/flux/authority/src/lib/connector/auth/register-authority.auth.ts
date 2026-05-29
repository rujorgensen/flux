import type {
    TNetworkId_S,
} from '@flux/shared/types';
import {
    type TFluxClientUID,
    validateMachineUID,
} from '@flux/shared/utils';

export class RetryableError extends Error {}
export class ConnectionError extends RetryableError {
    constructor(
        message: string,
        public readonly statusCode?: number,
    ) {
        super(message);
        this.name = 'ConnectionError';
    }
}
export class AuthenticationError extends Error {
    constructor(
        message: string,
    ) {
        super(message);
        this.name = 'AuthenticationError';
    }
}
export class EndpointNotFoundError extends Error {
    constructor(
        message: string,
    ) {
        super(message);
        this.name = 'EndpointNotFoundError';
    }
}

/**
 * Authenticates with the server and returns a ticket for connecting the websocket.
 * 
 * @param { TNetworkId_S } networkId - The network ID to connect to
 * @param { string } domain - The domain of the authority server
 * @param { string } networkAccessToken - The network access token for authentication
 * @param { object } clientInfo - Optional client identification info
 * 
 * @returns { Promise<unknown> } The authentication ticket
 */
export const authenticateNetworkAuthorityOrThrow = async (
    networkId: TNetworkId_S,
    domain: string,
    networkAccessToken: string,
    clientInfo: {
        machineUID?: TFluxClientUID,
    },
): Promise<unknown> => {
    const url = new URL(`${domain}/auth/network-authority`);
    url.searchParams.set('networkId', networkId);
    if (clientInfo.machineUID && validateMachineUID(clientInfo.machineUID)) {
        url.searchParams.set('machineUID', clientInfo.machineUID);
    }

    // * 1. Send the payload to the authority server and wait for the response
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain', //  'application/json',
                'Accept': 'text/plain',
            },
            body: networkAccessToken,
        });

        if (response.status === 401) {
            throw new AuthenticationError('Unauthorized: invalid network access token');
        }

        if (response.status === 404) {
            throw new EndpointNotFoundError(`Mesh server not found at ${url.origin}.`);
        }

        if (!response.ok) {
            const responseText: string = await response.text();
            const message: string = responseText
                ? `Auth failed: ${response.status} - ${responseText}`
                : `Auth failed: ${response.status}`;

            if ((response.status >= 500) || (response.status === 429)) {
                throw new ConnectionError(message, response.status);
            }

            throw new Error(message);
        }

        const result = await response.text();
        // if (!checkNAATTicketShape(result)) {
        //     throw new Error('Auth failed: unexpected response');
        // }

        return result;
    } catch (error) {
        if (
            (error instanceof AuthenticationError) ||
            (error instanceof EndpointNotFoundError) ||
            (error instanceof RetryableError)
        ) {
            throw error;
        }

        throw new ConnectionError(
            `Failed to reach mesh server at ${url.origin}: ${error instanceof Error ? error.message : 'Unknown connection error'}`,
        );
    }
};
