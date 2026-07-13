import * as jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import type { TNetworkId_S } from '@flux/shared/types';
import type { TFluxClientUID } from '@flux/shared/utils';

const secret = 'your-very-secure-secret'; // keep this secret safe!

export type TTokenPayload = {
    networkId: TNetworkId_S;
    claim?: string;
    isAuthority?: boolean;
    machineUID?: TFluxClientUID,
    agentUID?: string;
};

export type TTokenPayloadJWT = string & { __brand: 'TokenPayloadJWT'; };

/**
 * Generates JWT string from a token payload.
 * 
 * @param { TTokenPayload } payload - The token payload to sign
 * @param { StringValue | number } [expiresIn] - Token expiry as a jsonwebtoken
 *        timespan (e.g. '15m') or a number of seconds.
 *
 * @returns { string } The signed JWT string
 */
export const generateToken = (
    payload: TTokenPayload,
    // The token only gates the WS upgrade; live sockets are not re-checked, so a
    // short lifetime is safe. NB: a reconnect after expiry needs a freshly-minted
    // token (client-side auto-renewal is not yet implemented).
    expiresIn: StringValue | number = '15m',
): string => {
    return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Normalizes the authority claim to the string form used throughout mesh.
 *
 * Authorities may return either a ready-made string token or a structured
 * payload object. Structured claims are serialized here so the WebSocket auth
 * payload and downstream channel logic keep receiving a string.
 */
export const normalizeAuthorityClaimOrThrow = (
    claim: unknown,
): string => {
    if (typeof claim === 'string') {
        return claim;
    }

    if (!claim || (typeof claim !== 'object')) {
        throw new Error('Network authority returned an invalid claim. Expected a string token or serializable object.');
    }

    try {
        const normalizedClaim = JSON.stringify(claim);
        if (!normalizedClaim) {
            throw new Error('Network authority returned an invalid claim. Expected a string token or serializable object.');
        }
        return normalizedClaim;
    } catch {
        throw new Error('Network authority returned an invalid claim. The claim could not be serialized.');
    }

};

/**
 * Verifies a JWT token and returns the payload or throws if invalid.
 * 
 * @param { unknown } token - The JWT token string to verify
 * 
 * @returns { TTokenPayload } The decoded token payload
 */
export const verifyTokenOrThrow = (
    token: unknown,
    // callback?: VerifyCallback<JwtPayload | string>,
): TTokenPayload => {
    if (typeof token !== 'string') {
        throw new Error('Token must be a string');
    }

    try {
        const decoded = jwt.verify(token, secret);

        return decoded as TTokenPayload;
    } catch (err) {
        console.error('Invalid or expired token', (<any>err).message);

        throw new Error('Invalid or expired token');
    }
};
