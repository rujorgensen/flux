// * Errors
export {
    UnknownClientError,
} from './lib/errors/unknown-client.error';
export {
    GlobalRPCTimeoutError as RPCTimeoutError,
} from './lib/errors/global-rpc-timeout.error';

export * from './lib/flux-shared';

export {
    type TChannelTopic,
    validateTopic,
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

export type {
    TClientOwnUId,
} from './lib/client.type';

export {
    type TProcessId,
    type TProcessAddress,
    type TMachineAddress,
    type TClientId,
    type TAddress,
    splitAddress,
    splitProcessAddress,
} from './lib/routing.type';
