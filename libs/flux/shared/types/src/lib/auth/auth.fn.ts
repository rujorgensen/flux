import type {
    TAuthenticationTicket,
    TNetworkAuthorityAuthenticationTicket,
} from './auth.types';

/**
 * Soft check on the general shape of the ticket.
 */
export const checkAuthTicketShape = (
    ticket: unknown,
): ticket is TAuthenticationTicket => {
    return typeof ticket === 'string';
};

/**
 * Soft check on the general shape of the ticket.
 */
export const checkNAATTicketShape = (
    ticket: unknown,
): ticket is TNetworkAuthorityAuthenticationTicket => {
    return typeof ticket === 'string' &&
        ticket.startsWith('naat-')
        ;
};

/**
 * The callback to authorize a network join request from an client agent.
 * 
 * @param { T } auth - The agents claim to access network
 * 
 * @returns { Promise<string> } - possible a JWT for later identification (type so it matches the claim when validating channel topic subscription)
 */
export type TAuthorizeCallback<T> = (
    auth: T,
) => Promise<string>;