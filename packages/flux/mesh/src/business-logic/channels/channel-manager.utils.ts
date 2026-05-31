import type {
    TSubscription_S,
} from '@flux/shared/types';
import {
    MAX_CHANNEL_MEMBERS_BY_SUBSCRIPTION_TYPE,
} from '@flux/shared/features/channels';

const normalizeSubscriptionType = (
    subscriptionType?: unknown,
): TSubscription_S | undefined => {
    if (typeof subscriptionType !== 'string') {
        return undefined;
    }

    const normalizedSubscriptionType = subscriptionType.toLowerCase();

    if ((normalizedSubscriptionType === 'lowest') ||
        (normalizedSubscriptionType === 'free')) {
        return 'free';
    }

    if ((normalizedSubscriptionType === 'medium') ||
        (normalizedSubscriptionType === 'high')) {
        return normalizedSubscriptionType;
    }

    return undefined;
};

export const resolveSubscriptionTypeOrDefault = (
    subscriptionType?: unknown,
): TSubscription_S => {
    return normalizeSubscriptionType(subscriptionType) ?? 'free';
};

const readMaxChannelMembers = (
    subscriptionType?: unknown,
): number => MAX_CHANNEL_MEMBERS_BY_SUBSCRIPTION_TYPE[resolveSubscriptionTypeOrDefault(subscriptionType)];

export const readSubscriptionTypeFromClaim = (
    claim?: unknown,
): TSubscription_S | undefined => {
    if (typeof claim !== 'string' || claim === '') {
        return undefined;
    }

    const normalizedClaim = normalizeSubscriptionType(claim);
    if (normalizedClaim) {
        return normalizedClaim;
    }

    const readSubscriptionTypeFromPayload = (
        payload: unknown,
    ): TSubscription_S | undefined => {
        if (!payload || typeof payload !== 'object') {
            return undefined;
        }

        const payloadRecord = payload as Record<string, unknown>;
        const userCandidate = payloadRecord['user'];
        const nestedUser = userCandidate && typeof userCandidate === 'object'
            ? userCandidate as Record<string, unknown>
            : undefined;

        const candidates: unknown[] = [
            payloadRecord['subscriptionType'],
            payloadRecord['subscription'],
            payloadRecord['tier'],
            payloadRecord['plan'],
            nestedUser?.['subscriptionType'],
            nestedUser?.['subscription'],
            nestedUser?.['tier'],
            nestedUser?.['plan'],
        ];

        for (const candidate of candidates) {
            if (typeof candidate !== 'string') {
                continue;
            }

            const normalizedCandidate = normalizeSubscriptionType(candidate);
            if (normalizedCandidate) {
                return normalizedCandidate;
            }
        }

        return undefined;
    };

    try {
        const parsedClaim = JSON.parse(claim);
        const subscriptionTypeFromJson = readSubscriptionTypeFromPayload(parsedClaim);

        if (subscriptionTypeFromJson) {
            return subscriptionTypeFromJson;
        }
    } catch {
        // ignore non-json claim
    }

    const jwtParts = claim.split('.');
    if (jwtParts.length < 2) {
        return undefined;
    }

    try {
        const payloadBuffer = Buffer.from(
            jwtParts[1],
            'base64url',
        );
        const payloadRaw = payloadBuffer.toString('utf8');
        const payload = JSON.parse(payloadRaw);

        return readSubscriptionTypeFromPayload(payload);
    } catch {
        return undefined;
    }
};

export const canChannelHaveMoreMembers = (
    memberCount: number,
    subscriptionType?: TSubscription_S,
): boolean => memberCount < readMaxChannelMembers(subscriptionType);
