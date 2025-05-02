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
    getRedisConnection,
} from './redis/redis-connection.class';

export class OutgoingMessageRouter {
    private readonly processId: TProcessId = readProcessId();
    private readonly machineAddress: TMachineAddress = readMachineAddress();

    private readonly redisConnection: RedisConnection = getRedisConnection();

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
     *
     * @param address
     * @param message
     *
     * @returns
     */
    public message(
        address: TAddress,
        message: string,
    ): void {
        const [machineAddress, processId, clientId] = splitAddressOrThrow(address);

        // * Not on the same machine
        if (machineAddress !== this.machineAddress) {
            console.log('🛣️ Routing message to machine');

            this.redisConnection.directPublish(address, message);

            return;
        }

        // * On the same machine, but not on the same process
        if (processId !== this.processId) {
            console.log(`🛣️  Routing message from process ID '${this.processId}' to process ID: '${processId}'`);

            // ! Route through Redis for now, but change to direct process connection
            this.redisConnection.directPublish(address, message);

            return;
        }

        // * On the same machine and process
        console.log('🛣️ Routing message to local client');

        this.passToLocalClientOrThrowUnknownClient(clientId, message);
    }
}
