/**
 * A connection to another known client
 */

import { ICEConnection } from './connector/low-level-com/web-rtc/ice-connection';

export class FluxRemoteClient {

    constructor(
        private readonly iceConnection: ICEConnection,
    ) { }

    /**
     * Calls a remote procedure on the connected client.
     */
    public callProcedure(

    ): void {

    }

    /**
     * Sends a message to the connected client.
     * 
     * @param { string } message - The message to send to the connected client
     */
    public send(
        message: string,
    ): void {
        this.iceConnection.sendMessage(message);
    }
}