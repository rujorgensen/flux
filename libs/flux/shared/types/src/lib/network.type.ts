export type TNetworkId_S = string & { __brand: 'NetworkId'; };

/**
 * Validates a network ID.
 * 
 * @param { unknown } networkId
 *  
 * @returns { boolean } 
 */
export const validateNetworkIdOrThrow = (
    networkId: unknown,
): networkId is TNetworkId_S => {
    if (typeof networkId !== 'string') {
        throw new Error('Network ID must be a string');
    }

    if (networkId.includes(':')) {
        throw new Error('Network ID cannot contain :');
    }

    if (networkId.includes('/')) {
        throw new Error('Network ID cannot contain /');
    }

    if (!/^[A-Za-z0-9-]+$/.test(networkId)) {
        throw new Error('Network ID can only contain letters, numbers and dashes (\'-\')');
    }

    if (networkId.length > 100) {
        throw new Error('Network ID cannot be longer than 100 characters');
    }

    return true;
};