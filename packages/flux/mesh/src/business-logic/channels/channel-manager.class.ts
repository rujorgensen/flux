import {
    type TAddress,
    type TChannelName,
    type TNetworkId_S,
    type TSubscription_S,
    AUTHORITY_ON_CREATE_CHANNEL,
    AUTHORITY_ON_EMPTY_CHANNEL,
} from '@flux/shared/types';
import { NetworkChannelHash } from '@flux/mesh/store/redis/network-channel';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from '../../routing/redis/redis-connection.class';
import type { GlobalChannelPubsub } from '../../routing/global-channel/global-channel-pubsub.class';

export const MAX_CHANNEL_MEMBERS_BY_SUBSCRIPTION_TYPE: {
    [key in TSubscription_S]: number
} = {
    free: 25,
    medium: 500,
    high: 100_000,
} as const;

export const MAX_CHANNEL_MEMBERS = MAX_CHANNEL_MEMBERS_BY_SUBSCRIPTION_TYPE.high;

export const normalizeSubscriptionType = (
    subscriptionType?: string,
): TSubscription_S | undefined => {
    const normalizedSubscriptionType = subscriptionType?.toLowerCase();

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
    subscriptionType?: string,
): TSubscription_S => {
    return normalizeSubscriptionType(subscriptionType) ?? 'free';
};

export const readMaxChannelMembers = (
    subscriptionType?: string,
): number => MAX_CHANNEL_MEMBERS_BY_SUBSCRIPTION_TYPE[resolveSubscriptionTypeOrDefault(subscriptionType)];

export const readSubscriptionTypeFromClaim = (
    claim?: string,
): TSubscription_S | undefined => {
    if (!claim) {
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

interface IUsageCache {
    networkId: TNetworkId_S;
    usage: number;
};
export class NetworkChannelManager {
    private readonly channelUsageCount: Map<TChannelName, IUsageCache> = new Map();
    private readonly redisConnection: RedisConnection = getMeshRedisConnection();
    private readonly networkChannelHash: NetworkChannelHash = new NetworkChannelHash(
        this.redisConnection,
    );

    constructor(
        private readonly _globalChannelPubsub: GlobalChannelPubsub,
    ) {
        setInterval(() => {
            for (const [channelName, usage] of this.channelUsageCount) {

                if (usage.usage > 0) {
                    this.networkChannelHash
                        .incrementUsage(
                            usage.networkId,
                            channelName,
                            usage.usage,
                        );
                }

                this.channelUsageCount.delete(channelName);
            }
        }, 5_000);
    }

    /**
     * Checks if a channel can have more members.
     *  
     * ! TODO Don't query the database repeatedly, implement local synced cache.
     */
    public async canHaveMembers(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        subscriptionType?: TSubscription_S,
    ): Promise<boolean> {
        const count: number = await this.networkChannelHash.readNetworkMemberCount(
            networkId,
            channelName,
        );

        return Promise.resolve(canChannelHaveMoreMembers(
            count,
            subscriptionType,
        ));
    }

    /**
     * Joins a network channel.
     */
    public joinNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        clientAddress: TAddress,
    ): void {
        this.createNetworkChannelIfNotExist(
            networkId,
            channelName,
        );

        this.networkChannelHash.joinNetworkChannel(
            networkId,
            channelName,
            clientAddress,
        );
    }

    /**
     * Leaves a network channel.
     */
    public async leaveNetworkChannel(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        clientAddress: TAddress,
    ): Promise<void> {
        const membersLeft: number = await this.networkChannelHash
            .leaveNetworkChannel(
                networkId,
                channelName,
                clientAddress,
            );

        if (membersLeft === 0) {
            this._globalChannelPubsub
                .publish(
                    `~/networks/${networkId}/channel-empty`,
                    `${AUTHORITY_ON_EMPTY_CHANNEL}:${channelName}`,
                );
        }
    }

    /**
     * Leaves all network channels.
     */
    public async leaveAllNetworkChannels(
        networkId: TNetworkId_S,
        clientAddress: TAddress,
        channelNames: Set<TChannelName>,
    ): Promise<void> {
        return await this.networkChannelHash.leaveAllNetworkChannels(
            networkId,
            clientAddress,
            channelNames,
        );
    }

    /**
     * Creates a network channel if it does not exist.
     */
    private async createNetworkChannelIfNotExist(
        networkId: TNetworkId_S,
        channelName: TChannelName,
    ): Promise<void> {
        const wasCreated: boolean = await this.networkChannelHash
            .createNetworkChannelIfNotExist(
                networkId,
                channelName,
            );

        if (wasCreated) {
            this._globalChannelPubsub
                .publish(
                    `~/networks/${networkId}/channel-created`,
                    `${AUTHORITY_ON_CREATE_CHANNEL}:${channelName}`,
                );
        }
    }

    // ****************************************************************************
    // *** Update
    // ****************************************************************************

    /**
     * Increases the usage count of a channel.
     */
    public increaseUsageCount(
        networkId: TNetworkId_S,
        channelName: TChannelName,
        usage: number,
    ): void {
        const channelUsageCache: {
            networkId: TNetworkId_S;
            usage: number;
        } | undefined = this.channelUsageCount.get(channelName);

        this.channelUsageCount.set(
            channelName,
            channelUsageCache ? {
                ...channelUsageCache,
                usage: channelUsageCache.usage + usage,
            } : {
                networkId,
                usage: usage,
            },
        );
    }
}
