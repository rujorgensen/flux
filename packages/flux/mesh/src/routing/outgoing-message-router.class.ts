/**
 * Route messages to the correct destination.
 */
import {
    splitAddress,
    TAddress,
    TClientId,
    TMachineAddress,
    TProcessId,
} from '@flux/shared';
import { readMachineAddress, readProcessId } from './addressing.utils';
import {
    getRedisConnection,
    RedisConnection,
} from './redis/redis-connection.class';

export class OutgoingMessageRouter {
    private readonly processId: TProcessId = readProcessId();
    private readonly machineAddress: TMachineAddress = readMachineAddress();

    private readonly redisConnection: RedisConnection = getRedisConnection();

    constructor(
        private readonly passToLocalClient: (
            clientId: TClientId,
            message: string
        ) => void
    ) {
        console.log(
            `Created MessageRouter on machine address: ${this.machineAddress}, process id: ${this.processId}`
        );

        setInterval(() => {
            this.redisConnection.setConnected(
                `${this.machineAddress}/${this.processId}`
            );
        }, 3_000);
    }

    /**
     *
     * @param address
     * @param message
     *
     * @returns
     */
    public message(address: TAddress, message: string): void {
        const [machineAddress, processId, clientId] = splitAddress(address);

        // * Not on the same machine
        if (machineAddress !== this.machineAddress) {
            console.log('🛣️ Routing message to machine');

            this.redisConnection.send(address, message);

            return;
        }

        // * On the same machine, but not on the same process
        if (processId !== this.processId) {
            console.log(`🛣️  Routing message to process ID: ${processId}`);

            // ! Route through Redis for now, but change to direct process connection
            this.redisConnection.send(address, message);

            return;
        }

        // * On the same machine and process
        console.log('🛣️ Routing message to local client');

        this.passToLocalClient(clientId, message);
    }
}
