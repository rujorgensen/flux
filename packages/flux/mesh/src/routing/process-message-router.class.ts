/**
 * Route messages to the correct process if necessary.
 */
import {
    type TCallbackFunction,
    type TMachineAddress,
    type TProcessId,
    type TProcessAddress,
    type TClientId,
    splitProcessAddress,
    TAddress,
    splitAddressOrThrow,
} from '@flux/shared/types';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from './redis/redis-connection.class';
import {
    readProcessId,
    readProcessAddress,
    readMachineAddress,
} from './addressing.utils';
import { PicoLogger } from '@utils/pico-logger';

export class ProcessMessageRouter {
    private readonly machineAddress: TMachineAddress = readMachineAddress();
    private readonly processAddress: TProcessAddress = readProcessAddress();
    private readonly processId: TProcessId = readProcessId();
    private readonly redisConnection: RedisConnection = getMeshRedisConnection();
    private readonly localCallbacks: Set<TCallbackFunction> = new Set();
    private readonly localKickCallbacks: Set<(clientId: TClientId) => void> = new Set();

    /**
     * Sends a message to a process.
     * 
     * @param { TProcessAddress } address - The destination process address
     * @param { string } message - The message to route
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
            PicoLogger.log('🛣️ Routing message to process (todo; direct process)', 'routing');
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
     * Subscribes to messages for the local process.
     * 
     * @param { TCallbackFunction } onMessage - Callback to invoke when a message is received
     */
    public subscribe(
        onMessage: TCallbackFunction,
    ): void {
        console.log('🗒️ Subscribing process', this.processAddress);

        this.localCallbacks.add(onMessage);

        //  Listen to remote
        this.redisConnection.subscribe(this.processAddress, onMessage);
    }

    /**
     * Sends a message to kick a client.
     * 
     * @param { TAddress } fullClientAddress - The full client address
     * 
     * @returns { void }
     */
    public kickClient(
        fullClientAddress: TAddress,
    ): void {
        const [machineAddress, processId, clientId] = splitAddressOrThrow(fullClientAddress);
        const address: TProcessAddress = `${machineAddress}/${processId}`;

        // * Not on the same machine
        if (machineAddress !== this.machineAddress) {
            PicoLogger.log('🛣️ Routing message to machine', 'routing');

            this.redisConnection.directPublish(`kick-${address}` as TProcessAddress, clientId);

            return;
        }

        // * Not on the same process
        if (processId !== this.processId) {
            PicoLogger.log('🛣️ Routing message to process (todo; direct process)', 'routing');
            // ! Route through Redis for now, but change to direct process connection
            this.redisConnection.directPublish(`kick-${address}` as TProcessAddress, clientId);

            return;
        }

        // * This must be to local process
        PicoLogger.log('🛣️ Routing message to local', 'routing');
        for (const localCallback of this.localKickCallbacks) {
            localCallback(clientId);
        }
    }

    /**
     * Subscribe to kicks on local clients.
     */
    public onKickLocalClient(
        onKick: (
            clientId: TClientId,
        ) => void,
    ): void {
        console.log('🗒️ Subscribing process', this.processAddress);

        this.localKickCallbacks.add(onKick);

        //  Listen to remote
        this.redisConnection.subscribe(
            `kick-${this.processAddress}` as TProcessAddress,
            (
                clientId: string,
            ) => onKick(clientId as TClientId),
        );
    }
}
