/**
 * Route messages to the correct destination.
 */
import type { TClientId } from '@flux/shared';
import {
    getRedisConnection,
    RedisConnection,
} from './redis/redis-connection.class';

export class IncommingClientMessageRouter {
    private readonly redisConnection: RedisConnection = getRedisConnection();

    constructor(
        private readonly onLocal: (
            clientId: TClientId,
            onMessage: (message: string) => void
        ) => void
    ) {}

    /**
     *
     * @param address
     * @param message
     *
     * @returns { void }
     */
    //     public subscribe(
    //         clientId: TClientId,
    //         onMessage: (
    //             message: string,
    //         ) => void,
    //     ): void {
    // console.log("subscreibing client", clientId);
    //         // Listen to local
    //         this.onLocal(
    //             clientId,
    //             onMessage,
    //         );

    //         // Listen to remote
    //         this.redisConnection
    //             .subscribe(
    //                 clientId,
    //                 onMessage,
    //             );
    //     }
}
