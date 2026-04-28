export type TNetworkId_S = string & { __brand: 'NetworkId'; };
export type TNetworkKey_S = string & { __brand: 'NetworkKey'; };
/**
 * Subscription tiers used by runtime channel-limit logic.
 * Keep this union aligned with Prisma enum `ESubscriptionType`.
 * Runtime values are lowercase (`free|medium|high`) while Prisma stores uppercase
 * enum values (`FREE|MEDIUM|HIGH`) for database persistence.
 */
export type TSubscription_S = 'free' | 'medium' | 'high';

/**
 * Validates a network ID.
 */
export const validateNetworkIdOrThrow = (
    networkId: unknown,
): networkId is TNetworkId_S => {
    if (typeof networkId !== 'string') {
        throw new Error('Network ID must be a string');
    }

    if (networkId === '') {
        throw new Error('Network ID cannot be empty');
    }

    if (networkId === 'undefined' || networkId === 'null') {
        throw new Error('Network ID cannot be "null" or "undefined"');
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
