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
    getMeshRedisConnection,
} from './redis/redis-connection.class';
import {
    readMachineAddress,
    readProcessAddress,
    readProcessId,
} from './addressing.utils';
import { PicoLogger } from '@utils/pico-logger';

export class ProcessMessageRouter {
    private readonly machineAddress: TMachineAddress = readMachineAddress();
    private readonly processAddress: TProcessAddress = readProcessAddress();
    private readonly processId: TProcessId = readProcessId();
    private readonly redisConnection: RedisConnection = getMeshRedisConnection();
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
            PicoLogger.log('🛣️ Routing message to machine', 'routing');

            this.redisConnection.directPublish(address, message);

            return;
        }

        // * Not on the same process
        if (processId !== this.processId) {
            PicoLogger.log('🛣️ Routing message to process', 'routing');
            // ! Route through Redis for now, but change to direct process connection
            this.redisConnection.directPublish(address, message);

            return;
        }

        // * This must be to local process
        PicoLogger.log('🛣️ Routing message to local', 'routing');
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
        console.log('🗒️ Subscribing process', this.processAddress);

        this.localCallbacks.add(onMessage);

        //  Listen to remote
        this.redisConnection.subscribe(this.processAddress, onMessage);
    }
}
