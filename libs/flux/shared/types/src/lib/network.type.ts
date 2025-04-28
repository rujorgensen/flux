export type TNetworkId_S = string & { __brand: 'NetworkId'; };

export const validateNetworkId = (
    networkId: string,
): networkId is TNetworkId_S => {
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