import { describe, expect, it } from 'bun:test';
import {
    MAX_CHANNEL_MEMBERS_BY_SUBSCRIPTION_TYPE,
    MAX_CHANNEL_MEMBERS,
    canChannelHaveMoreMembers,
    readSubscriptionTypeFromClaim,
    resolveSubscriptionTypeOrDefault,
} from './business-logic/channels/channel-manager.class';
import { normalizeAuthorityClaimOrThrow } from './auth/auth';

const ONE_MILLION_MESSAGES = 1_000_000;

interface IPerfScenario {
    name: string;
    members: number;
    maxDurationMs: number;
}

interface IRoundRobinTransferResult {
    durationMs: number;
    deliveredMessages: number;
    deliveredPerMember: Uint32Array;
}

const runRoundRobinTransfer = (
    memberCount: number,
    messageCount: number,
): IRoundRobinTransferResult => {
    const deliveredPerMember: Uint32Array = new Uint32Array(memberCount);
    const start: number = performance.now();
    let currentMemberIndex = 0;

    for (let i = 0; i < messageCount; i++) {
        deliveredPerMember[currentMemberIndex]++;
        currentMemberIndex++;

        if (currentMemberIndex === memberCount) {
            currentMemberIndex = 0;
        }
    }

    return {
        durationMs: performance.now() - start,
        deliveredMessages: messageCount,
        deliveredPerMember,
    };
};

const assertRoundRobinDistribution = (
    deliveredPerMember: Uint32Array,
    totalMessages: number,
): void => {
    const minMessagesPerMember = Math.floor(totalMessages / deliveredPerMember.length);
    const maxMessagesPerMember = Math.ceil(totalMessages / deliveredPerMember.length);
    let countedMessages = 0;

    for (const messageCount of deliveredPerMember) {
        expect(messageCount).toBeGreaterThanOrEqual(minMessagesPerMember);
        expect(messageCount).toBeLessThanOrEqual(maxMessagesPerMember);
        countedMessages += messageCount;
    }

    expect(countedMessages).toBe(totalMessages);
};

describe('channel member limit', () => {
    it('should allow up to the high plan limit, but not above', () => {
        expect(MAX_CHANNEL_MEMBERS).toBe(100_000);
        expect(canChannelHaveMoreMembers(MAX_CHANNEL_MEMBERS - 1, 'high')).toBe(true);
        expect(canChannelHaveMoreMembers(MAX_CHANNEL_MEMBERS, 'high')).toBe(false);
        expect(canChannelHaveMoreMembers(MAX_CHANNEL_MEMBERS + 1, 'high')).toBe(false);
    });

    it('should apply channel member limits by subscription type', () => {
        expect(MAX_CHANNEL_MEMBERS_BY_SUBSCRIPTION_TYPE).toEqual({
            free: 25,
            medium: 500,
            high: 100_000,
        });

        expect(canChannelHaveMoreMembers(24, 'free')).toBe(true);
        expect(canChannelHaveMoreMembers(25, 'free')).toBe(false);

        expect(canChannelHaveMoreMembers(499, 'medium')).toBe(true);
        expect(canChannelHaveMoreMembers(500, 'medium')).toBe(false);

        expect(canChannelHaveMoreMembers(99_999, 'high')).toBe(true);
        expect(canChannelHaveMoreMembers(100_000, 'high')).toBe(false);
    });

    it('should default to the free limit for missing and unknown subscriptions', () => {
        expect(canChannelHaveMoreMembers(24)).toBe(true);
        expect(canChannelHaveMoreMembers(25)).toBe(false);

        expect(resolveSubscriptionTypeOrDefault('unknown-tier')).toBe('free');
        expect(resolveSubscriptionTypeOrDefault({
            tier: 'high',
        })).toBe('free');
    });

    it('should parse subscription type from claim payloads', () => {
        expect(readSubscriptionTypeFromClaim('lowest')).toBe('free');
        expect(readSubscriptionTypeFromClaim('LOWEST')).toBe('free');
        expect(readSubscriptionTypeFromClaim('medium')).toBe('medium');
        expect(readSubscriptionTypeFromClaim('MeDiUm')).toBe('medium');

        expect(readSubscriptionTypeFromClaim(JSON.stringify({
            subscriptionType: 'high',
        }))).toBe('high');
        expect(readSubscriptionTypeFromClaim(JSON.stringify({
            user: {
                tier: 'medium',
            },
        }))).toBe('medium');

        const jwtWithTier = `header.${Buffer.from(JSON.stringify({
            plan: 'high',
        })).toString('base64url')}.sig`;
        expect(readSubscriptionTypeFromClaim(jwtWithTier)).toBe('high');

        expect(readSubscriptionTypeFromClaim('invalid.jwt.payload')).toBeUndefined();
        expect(readSubscriptionTypeFromClaim(JSON.stringify({
            subscriptionType: 'custom',
        }))).toBeUndefined();
        expect(readSubscriptionTypeFromClaim({
            subscriptionType: 'high',
        })).toBeUndefined();
    });
});

describe('authority claim normalization', () => {
    it('should keep string claims unchanged', () => {
        expect(normalizeAuthorityClaimOrThrow('signed-jwt')).toBe('signed-jwt');
    });

    it('should serialize structured claims to json strings', () => {
        expect(normalizeAuthorityClaimOrThrow({
            subscriptionType: 'high',
            userId: 'user-1',
        })).toBe(JSON.stringify({
            subscriptionType: 'high',
            userId: 'user-1',
        }));
    });

    it('should reject unsupported claim values', () => {
        expect(() => normalizeAuthorityClaimOrThrow(42)).toThrow(
            'Network authority returned an invalid claim. Expected a string token or serializable object.',
        );
        expect(() => normalizeAuthorityClaimOrThrow(null)).toThrow(
            'Network authority returned an invalid claim. Expected a string token or serializable object.',
        );
    });
});

describe('round robin transfer performance', () => {
    const scenarios: IPerfScenario[] = [
        {
            name: 'small channel',
            members: 3,
            maxDurationMs: 4_000,
        },
        {
            name: 'medium channel',
            members: 30,
            maxDurationMs: 4_000,
        },
        {
            name: 'large channel',
            members: 3_000,
            maxDurationMs: 6_000,
        },
        {
            name: 'extra large channel',
            members: 1_000_000,
            maxDurationMs: 15_000,
        },
    ];

    for (const scenario of scenarios) {
        it(`should handle ${scenario.name} with ${scenario.members.toLocaleString()} members`, () => {
            const result = runRoundRobinTransfer(
                scenario.members,
                ONE_MILLION_MESSAGES,
            );

            expect(result.deliveredMessages).toBe(ONE_MILLION_MESSAGES);
            expect(result.durationMs).toBeLessThanOrEqual(scenario.maxDurationMs);
            assertRoundRobinDistribution(
                result.deliveredPerMember,
                ONE_MILLION_MESSAGES,
            );
        });
    }
});
