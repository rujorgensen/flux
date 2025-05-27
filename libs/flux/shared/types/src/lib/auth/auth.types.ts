import type { TNetworkId_S } from '@flux/shared/types';

/**
 * Ticket returned by the authentication service. Pass this ticket when connecting the websocket.
 */
export type TAuthenticationTicket = string & { brand: 'TAuthenticationTicket'; };
export type TNetworkAuthorityAuthenticationTicket = `naat-${TNetworkId_S}-${string}`;