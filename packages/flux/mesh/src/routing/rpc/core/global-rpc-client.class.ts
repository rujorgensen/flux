/**
 * The class to handling the *calling* side of the RPC.
 */

import {
    type TAddress,
    type TProcessAddress,
    GlobalRPCTimeoutError,
    RPC_REQUEST,
} from '@flux/shared/types';
import type {
    TCallback,
    RPCRequest,
    RPCResponse,
} from '@flux/shared/ws';
import type { OutgoingMessageRouter } from '../../outgoing-message-router.class';
import type { ProcessMessageRouter } from '../../process-message-router.class';
import { readProcessAddress } from '../../addressing.utils';

export class GlobalRPCClient<TMethods> {
    // TODO OD IS USED TO ROUTE THE MESSAGE; SO MAKE GLOBALLY UNIQUE IN THE FUTURE!!!
    private requestId: number = 0; // Math.floor(Math.random() * 100_000);

    // Success and error callbacks for each request.
    private readonly pendingRequests: Map<number, [TCallback, TCallback]> =
        new Map();

    private readonly processAddress: TProcessAddress = readProcessAddress();

    constructor(
        private readonly _outgoingMessageRouter: OutgoingMessageRouter,
        private readonly _processMessageRouter: ProcessMessageRouter,
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
     * @param { TAddress } rpcServerClientAddress - The address of the RPC server client
     * @param { TMethods } method - The method name to call
     * @param { any[] } params - The parameters to pass
     * 
     * @returns { Promise<any> } The result from the remote method
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

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, [resolve, reject]);

            try {
                this._outgoingMessageRouter.message(
                    rpcServerClientAddress,
                    `${RPC_REQUEST}:${JSON.stringify(rpcRequest)}`
                );
            } catch (error) {
                if (this.pendingRequests.get(id)) {
                    this.pendingRequests.delete(id);
                    reject(error instanceof Error ? error : new Error(error as string));
                }
            }

            setTimeout(() => {
                if (this.pendingRequests.get(id)) {
                    this.pendingRequests.delete(id);
                    reject(new GlobalRPCTimeoutError(method as string));
                }
            }, 5_000);
        });
    }

    /**
     * Handles the response from the server.
     * 
     * @param { RPCResponse } response - The response from the RPC server
     */
    private handleResponseMessage(
        response: RPCResponse,
    ): void {
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
     * @param { TMethods } method - The method name to call
     * @param { any[] } params - The parameters to pass
     * 
     * @returns { Promise<any> } The result from the remote method
     */
    public call(
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

        return new Promise((resolve, reject) => {

            this.pendingRequests.set(id, [resolve, reject]);

            try {
                this._outgoingMessageRouter.message(
                    this._rpcServerClientAddress,
                    `${RPC_REQUEST}:${JSON.stringify(rpcRequest)}`
                );
            } catch (error) {
                if (this.pendingRequests.get(id)) {
                    this.pendingRequests.delete(id);
                    reject(error instanceof Error ? error : new Error(error as string));
                }
            }

            setTimeout(() => {
                if (this.pendingRequests.get(id)) {
                    this.pendingRequests.delete(id);
                    reject(new GlobalRPCTimeoutError(method as string));
                }
            }, 5_000);
        });
    }

    /**
     * Handles the response from the server.
     * 
     * @param { RPCResponse } response - The response from the RPC server
     */
    private handleResponseMessage(
        response: RPCResponse,
    ): void {
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
