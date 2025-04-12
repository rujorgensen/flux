export type TClientOwnUId = string & { __brand: 'flux_client_own_uid'; };

export * from './lib/flux-shared';
export * from './lib/low-level-ws.interfaces';
export * from './lib/rpc/rpc-server.class';
export * from './lib/rpc/rpc-client.class';
export * from './lib/rpc/rpc.interfaces';
export type {
    TAuthenticationTicket,
    TNetworkAuthorityAuthenticationTicket,
} from './lib/auth/auth.types';
export {
    checkAuthTicketShape,
    checkNAATTicketShape,
} from './lib/auth/auth.fn';
export * from './lib/routing.type';
export * from './lib/channel.type';
export type {
    IPackageStatus,
} from './lib/package-status.interfaces';
