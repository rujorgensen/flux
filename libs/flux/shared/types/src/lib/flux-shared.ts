export type TNetworkId_S = string & { __brand: 'TNetworkId'; };

// export interface ISocketPackage {
//     type: 'MESSAGE' | 'ERROR';
// }

// ****************************************************************************
// *** Network Layer Messager (before being connected to network)
// ****************************************************************************
export interface IValidationSocketPackage {
    networkId: TNetworkId_S;
    clientName?: string; // Optional custom client name, throws, if already exists
    data: unknown;
}

export interface IRegisterAutoritySocketPackage {
    networkId: TNetworkId_S;
    authorityKey: string;
}

// ****************************************************************************
// *** Errors
// ****************************************************************************

export const VALIDATION_ERROR_SOCKET_PACKAGE: string = 'No network authority found';
export const VALIDATION_ERROR_NO_NETWORK_SOCKET_PACKAGE: string = 'Network not found';
export const VALIDATION_ERROR_WS_DATA_SOCKET_PACKAGE: string = 'Expected data property not found';

/**
 * Identifies a node that is connected to the network.
 */
export interface IConnectedNode {
    nodeSessionId: string;
    ip: {
        address: string, // "::ffff:127.0.0.1",
        family: string, // "IPv6",
        port: number,
    };
}

export type TCallbackFunction = (
    message: string,
) => void;
