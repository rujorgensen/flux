import { describe, expect, it } from 'bun:test';
import {
    MAX_CHANNEL_MEMBERS,
    canChannelHaveMoreMembers,
} from './business-logic/channels/channel-manager.class';

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
    it('should allow up to one million members, but not above', () => {
        expect(MAX_CHANNEL_MEMBERS).toBe(1_000_000);
        expect(canChannelHaveMoreMembers(MAX_CHANNEL_MEMBERS - 1)).toBe(true);
        expect(canChannelHaveMoreMembers(MAX_CHANNEL_MEMBERS)).toBe(false);
        expect(canChannelHaveMoreMembers(MAX_CHANNEL_MEMBERS + 1)).toBe(false);
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
