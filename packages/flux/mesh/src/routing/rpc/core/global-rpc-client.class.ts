/**
 * The class to handling the *calling* side of the RPC.
 */

import {
    RPC_REQUEST,
    RPCRequest,
    RPCResponse,
    TAddress,
    TCallback,
    TProcessAddress,
} from '@flux/shared/types';
import { OutgoingMessageRouter } from '../../outgoing-message-router.class';
import { ProcessMessageRouter } from '../../process-message-router.class';
import { readProcessAddress } from '../../addressing.utils';

export class GlobalRPCClient<TMethods> {
    // TODOOD IS USED TO ROUTE THE MESSAGE; SO MAKE GLOBALLY UNIQWUE IN THE FUTURE!!!
    private requestId: number = 0; // Math.floor(Math.random() * 100_000);

    // Success and error callbacks for each request.
    private readonly pendingRequests: Map<number, [TCallback, TCallback]> =
        new Map();

    private readonly processAddress: TProcessAddress = readProcessAddress();

    constructor(
        private readonly _outgoingMessageRouter: OutgoingMessageRouter,
        private readonly _processMessageRouter: ProcessMessageRouter
    ) {
        this._processMessageRouter.subscribe((message: string): void => {
            const message_: RPCResponse = JSON.parse(
                message.substring(message.indexOf(':') + 1)
            ) as RPCResponse;

            this.handleResponseMessage(message_);
        });
    }

    /**
     * Calls a function on the other side.
     *
     * @param { TAddress } rpcServerClientAddress
     * @param { TMethods } method
     *
     * @returns { Promise<any> }
     */
    public call(
        rpcServerClientAddress: TAddress,
        method: TMethods,
        ...params: any
    ): Promise<any> {
        const id: number = this.requestId++;

        const rpcRequest: RPCRequest<TMethods> = {
            id,
            originProcessAddress: this.processAddress,
            method,
            params,
        };

        this._outgoingMessageRouter.message(
            rpcServerClientAddress,
            `${RPC_REQUEST}:${JSON.stringify(rpcRequest)}`
        );

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, [resolve, reject]);

            setTimeout(() => {
                if (this.pendingRequests.get(id)) {
                    this.pendingRequests.delete(id);
                    reject(
                        new Error(
                            `Timeout waiting for RPC method response '${method}'`
                        )
                    );
                }
            }, 5_000);
        });
    }

    /**
     * Handles the response from the server.
     *
     * @param { RPCResponse }   response
     *
     * @returns { boolean }
     */
    private handleResponseMessage(response: RPCResponse): void {
        const cb: [TCallback, TCallback] | undefined = this.pendingRequests.get(
            response.id
        );

        if (cb) {
            this.pendingRequests.delete(response.id);

            if (response.error) {
                cb[1](response.error);

                return;
                // throw new Error(response.error);
            }

            cb[0](response.result);
        }
    }
}

export class GlobalRPCClient2<TMethods> {
    // TODOOD IS USED TO ROUTE THE MESSAGE; SO MAKE GLOBALLY UNIQWUE IN THE FUTURE!!!
    private requestId: number = 0; // Math.floor(Math.random() * 100_000);

    // Success and error callbacks for each request.
    private readonly pendingRequests: Map<number, [TCallback, TCallback]> =
        new Map();

    private readonly processAddress: TProcessAddress = readProcessAddress();

    constructor(
        private readonly _rpcServerClientAddress: TAddress,
        private readonly _outgoingMessageRouter: OutgoingMessageRouter,
        private readonly _processMessageRouter: ProcessMessageRouter
    ) {
        this._processMessageRouter.subscribe((message: string): void => {
            const message_: RPCResponse = JSON.parse(
                message.substring(message.indexOf(':') + 1)
            ) as RPCResponse;

            this.handleResponseMessage(message_);
        });
    }

    /**
     * Calls a function on the other side.
     *
     * @param { TAddress } rpcServerClientAddress
     * @param { TMethods } method
     *
     * @returns { Promise<any> }
     */
    public call(method: TMethods, ...params: any): Promise<any> {
        const id: number = this.requestId++;

        const rpcRequest: RPCRequest<TMethods> = {
            id,
            originProcessAddress: this.processAddress,
            method,
            params,
        };

        this._outgoingMessageRouter.message(
            this._rpcServerClientAddress,
            `${RPC_REQUEST}:${JSON.stringify(rpcRequest)}`
        );

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, [resolve, reject]);

            setTimeout(() => {
                if (this.pendingRequests.get(id)) {
                    this.pendingRequests.delete(id);
                    reject(
                        new Error(
                            `Timeout waiting for RPC method response '${method}'`
                        )
                    );
                }
            }, 5_000);
        });
    }

    /**
     * Handles the response from the server.
     *
     * @param { RPCResponse }   response
     *
     * @returns { boolean }
     */
    private handleResponseMessage(response: RPCResponse): void {
        const cb: [TCallback, TCallback] | undefined = this.pendingRequests.get(
            response.id
        );

        if (cb) {
            this.pendingRequests.delete(response.id);

            if (response.error) {
                cb[1](response.error);

                return;
                // throw new Error(response.error);
            }

            cb[0](response.result);
        }
    }
}
