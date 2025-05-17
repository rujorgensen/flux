/**
 * Route messages to the correct destination.
 */
import type { TClientId } from '@flux/shared/types';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from './redis/redis-connection.class';

export class IncommingMessageRouter {
    private readonly redisConnection: RedisConnection = getMeshRedisConnection();

    constructor(
        private readonly onLocal: (
            clientId: TClientId,
            onMessage: (message: string) => void
        ) => void
    ) { }

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
