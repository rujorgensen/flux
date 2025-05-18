import type { TChannelTopic, TClientId, TNetworkId_S, TProcessAddress } from '@flux/shared/types';

let redisConnection: StatsRedisConnection | undefined;

const FLUX_STATS_REDIS_URL: string | undefined = process.env.FLUX_STATS_REDIS_URL as string;

// if (!FLUX_STATS_REDIS_URL) {
//     throw new Error('Missing FLUX_STATS_REDIS_URL in .env');
// }

/**
 * Singleton function to get the Redis connection
 *
 * @returns
 */
export const getStatsRedisConnection = () => {
    redisConnection ??= new StatsRedisConnection(FLUX_STATS_REDIS_URL);

    return redisConnection;
};

export type MessageCallback = (message: string) => unknown;

export class StatsRedisConnection {
    // * Local caches
    private readonly networkClientHash: Map<`${TNetworkId_S}.${TClientId}`, TClientId> = new Map();

    constructor(
        private readonly url: string,
    ) {

        // 'Persist' the changes to Redis regularly
        setInterval(() => {

        }, 5_000);
    }

    // ****************************************************************************
    // *** Set stats
    // ****************************************************************************
    public channelAdded(
        networkId: TNetworkId_S,
        channelId: TChannelTopic,
    ): void {
        throw new Error('Method not  channelAddedimplemented.');
    }

    public channelDeleted(
        networkId: TNetworkId_S,
        channelId: TChannelTopic,
    ): void {
        throw new Error('Method not implemented. channelDeleted');
    }

    public authorityConnected(
        networkId: TNetworkId_S,
        authorityInfo: unknown,
    ): void {


        // //    public async registerNetworkClient(
        // //        networkId: TNetworkId_S,
        // //        clientId: TAddress,
        // //        uid: TClientOwnUId
        // //    ): Promise<void> {
        // const key: string = `networks/${networkId}/client-uid`;
        // //  await this.client
        // //      .set([address], '1', { EX: 5 });

        // await this.client.hSet(key, {
        //     [uid]: clientId,
        // });

        // await this.client.expire(key, 500);
    }

    public authorityDisconnected(
        networkId: TNetworkId_S,
        authorityClientId: TClientId,
    ): void {
        throw new Error('Method not implemented. authorityDisconnec');
    }

    public agentConnected(
        networkId: TNetworkId_S,
        agentClientId: TClientId,
    ): void {
        throw new Error('Method not implemented. agentConnected');
    }

    public agentDisconnected(
        networkId: TNetworkId_S,
        agentInfo: unknown,
    ): void {
        throw new Error('Method not implemented. agentDisconnected');
    }

    public dataUsage(
        networkId: TNetworkId_S,
        dataUsageBytes: number,
    ): void {
      //   throw new Error('Method not implemented. dataUsage');
    }

    // ****************************************************************************
    // ***
    // ****************************************************************************
    public subscribe(
        channelId: TProcessAddress | TClientId,
        callback: MessageCallback
    ): void {
        // try {
        //     const redisCallback = (message: string) => callback(message);

        //     this.subscriber.subscribe(channelId, redisCallback);
        //     this.subscribers.set(callback, redisCallback);
        // } catch {
        //     console.log('error caught #2');
        // }
    }

    public unsubscribe(channelId: string, callback: MessageCallback): void {
        // try {
        //     const redisCallback = this.subscribers.get(callback);

        //     if (!redisCallback) {
        //         return;
        //     }

        //     this.publisher.unsubscribe(channelId, redisCallback);
        //     this.subscribers.delete(callback);
        // } catch {
        //     console.log('error caught #1');
        // }
    }
}
