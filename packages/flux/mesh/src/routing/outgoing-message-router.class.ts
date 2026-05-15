/**
 * Route messages to the correct destination.
 */
import {
    type TAddress,
    type TClientId,
    type TMachineAddress,
    type TProcessId,
    splitAddressOrThrow,
} from '@flux/shared/types';
import { readMachineAddress, readProcessId } from './addressing.utils';
import {
    type RedisConnection,
    getMeshRedisConnection,
} from './redis/redis-connection.class';
import { PicoLogger } from '@utils/pico-logger';

export class OutgoingMessageRouter {
    private readonly processId: TProcessId = readProcessId();
    private readonly machineAddress: TMachineAddress = readMachineAddress();

    private readonly redisConnection: RedisConnection = getMeshRedisConnection();

    constructor(
        private readonly passToLocalClientOrThrowUnknownClient: (
            clientId: TClientId,
            message: string,
        ) => void,
    ) {
        console.log(
            `Created MessageRouter on machine address: ${this.machineAddress}, process id: ${this.processId}`
        );
    }

    /**
     * Routes a message to the correct destination.
     * 
     * @param { TAddress } address - The destination address
     * @param { string } message - The message to route
     */
    public message(
        address: TAddress,
        message: string,
    ): void {
        const [machineAddress, processId, clientId] = splitAddressOrThrow(address);

        // * Not on the same machine
        if (machineAddress !== this.machineAddress) {
            PicoLogger.log('🛣️ Routing message to machine', 'routing');

            this.redisConnection.directPublish(address, message);

            return;
        }

        // * On the same machine, but not on the same process
        if (processId !== this.processId) {
            PicoLogger.log(`🛣️  Routing message from process ID '${this.processId}' to process ID: '${processId}'`, 'routing');

            // ! Route through Redis for now, but change to direct process connection
            this.redisConnection.directPublish(address, message);

            return;
        }

        // * On the same machine and process
        PicoLogger.log('🛣️ Routing message to local client', 'routing');

        this.passToLocalClientOrThrowUnknownClient(clientId, message);
    }
}
