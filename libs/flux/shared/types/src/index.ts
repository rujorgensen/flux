// * Errors
export {
    UnknownClientError,
} from './lib/errors/unknown-client.error';
export {
    GlobalRPCTimeoutError,
} from './lib/errors/global-rpc-timeout.error';

export * from './lib/flux-shared';

export {
    type TChannelName,
    validateChannelNameOrThrow,
} from './lib/channel.type';

export {
    type TAuthorizeCallback,
    checkAuthTicketShape,
    checkNAATTicketShape,
} from './lib/auth/auth.fn';

export type {
    TAuthenticationTicket,
    TNetworkAuthorityAuthenticationTicket,
} from './lib/auth/auth.types';

export {
    type IValidationSocketPackage,
    type IRegisterAutoritySocketPackage,
    type IConnectedNode,
    type TCallbackFunction,
    VALIDATION_ERROR_SOCKET_PACKAGE,
    VALIDATION_ERROR_NO_NETWORK_SOCKET_PACKAGE,
    VALIDATION_ERROR_WS_DATA_SOCKET_PACKAGE,
} from './lib/flux-shared';

export * from './lib/low-level-ws.interfaces';

export type {
    IPackageStatus,
} from './lib/package-status.interfaces';

export {
    type TAgentOwnUId,
    validateClientUIDOrThrow,
} from './lib/client.type';

export {
    type TProcessId,
    type TProcessAddress,
    type TMachineAddress,
    type TAddress,
    splitAddressOrThrow,
    splitProcessAddress,
} from './lib/routing.type';

// * Types
export {
    type TNetworkId_S,
    validateNetworkIdOrThrow,
} from './lib/network.type';
export type {
    TClientId,
} from './lib/client-id.type';