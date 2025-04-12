/**
 * A connection to another known client
 */

import { ICEConnection } from './connector/low-level-com/web-rtc/ice-connection';

export class FluxRemoteClient {

    constructor(
        private readonly iceConnection: ICEConnection,
    ) { }

    public callProcedure(

    ): void {

    }

    public send(
        message: string,
    ): void {
        this.iceConnection.sendMessage(message);
    }
}