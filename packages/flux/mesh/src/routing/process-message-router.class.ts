/**
 * Route messages to the correct process if necessary.
 */
import {
    type TCallbackFunction,
    type TMachineAddress,
    type TProcessId,
    type TProcessAddress,
    splitProcessAddress,
} from '@flux/shared/types';
import {
    type RedisConnection,
    getRedisConnection,
} from './redis/redis-connection.class';
import {
    readMachineAddress,
    readProcessAddress,
    readProcessId,
} from './addressing.utils';

export class ProcessMessageRouter {
    private readonly machineAddress: TMachineAddress = readMachineAddress();
    private readonly processAddress: TProcessAddress = readProcessAddress();
    private readonly processId: TProcessId = readProcessId();
    private readonly redisConnection: RedisConnection = getRedisConnection();
    private readonly localCallbacks: Set<TCallbackFunction> = new Set();

    /**
     * Sends a message to a process.
     *
     * @param { TProcessAddress }   address
     * @param { string }            message
     *
     * @returns
     */
    public message(
        address: TProcessAddress,
        message: string,
    ): void {
        const [machineAddress, processId] = splitProcessAddress(address);

        // * Not on the same machine
        if (machineAddress !== this.machineAddress) {
            console.log('🛣️ Routing message to machine');

            this.redisConnection.publish(address, message);

            return;
        }

        // * Not on the same process
        if (processId !== this.processId) {
            console.log('🛣️ Routing message to process');
            // ! Route through Redis for now, but change to direct process connection
            this.redisConnection.publish(address, message);

            return;
        }

        // This must be to local process
        console.log('🛣️ Routing message to local');
        for (const localCallback of this.localCallbacks) {
            localCallback(message);
        }
    }

    /**
     * Subscribe to mesaages for local process.
     *
     * @param message
     *
     * @returns { void }
     */
    public subscribe(
        onMessage: TCallbackFunction,
    ): void {
        console.log('subscreibing process', this.processAddress);

        this.localCallbacks.add(onMessage);

        //  Listen to remote
        this.redisConnection.subscribe(this.processAddress, onMessage);
    }
}
