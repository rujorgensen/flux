
export type TClientId = string & { __brand: 'TClientId'; };

export const NANOID_LENGTH = 21;
export const NANOID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-';

/**
 * Validates if the given id is a valid nanoid.
 */
export const isNanoId = (
    id: unknown,
): id is TClientId => {
    if (typeof id !== 'string') {
        return false;
    }

    // Check if illegal chars exit
    const regex = new RegExp(`^[${NANOID_ALPHABET}]{${NANOID_LENGTH}}$`);

    return regex.test(id);
};
