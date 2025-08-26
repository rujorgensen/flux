import jwt from 'jsonwebtoken';
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
 * @param { TTokenPayload }     payload
 * @param { number }            expiresIn
 * 
 * @returns { TTokenPayloadJWT }
 */
export const generateToken = (
    payload: TTokenPayload,
    expiresIn = 60_000 // ! TODO CHANGE TO LOW VALUE AGAINGA.. FOR DEVE.. Live for 60 seconds
): string => {
    return jwt.sign(payload, secret, { expiresIn });
};

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
