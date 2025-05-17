import jwt from 'jsonwebtoken';

const secret = 'your-very-secure-secret'; // keep this secret safe!

export const generateToken = (
    payload: object,
    expiresIn = 60_000 //! TODOD CHANGE TO LOW VALUE AGAINGA.. FOR DEVE.. Live for 60 seconds
): string => {
    return jwt.sign(payload, secret, { expiresIn });
};

export const verifyTokenOrThrow = (
    token: unknown,
    // callback?: VerifyCallback<JwtPayload | string>,
): object => {
    if (typeof token !== 'string') {
        throw new Error('Token must be a string');
    }

    try {
        const decoded = jwt.verify(token, secret);

        return decoded as any;
    } catch (err) {
        console.error('Invalid or expired token', (<any>err).message);

        throw new Error('Invalid or expired token');
    }
};
