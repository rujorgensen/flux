/**
 * The class to handling the *calling* side of the RPC.
 */
import type { RPCRequest, RPCResponse, TCallback } from './rpc.interfaces';
import type { TRPCResponseCallbackFunction } from '../flux-shared';
import {
    GlobalRPCTimeoutError,
    RPC_REQUEST,
    type TProcessAddress,
} from '@flux/shared/types';

export abstract class RPCClient<TMethods> {

    private requestId: number = Math.floor(Math.random() * 100_000);

    // Success and error callbacks for each request.
    private readonly pendingRequests: Map<number, [TCallback, TCallback]> = new Map();

    constructor(
        private readonly sendToRPCServer: (
            data: any, // ! Use 'unknown' or Bun.BufferSource (does not work)
            compress?: boolean | undefined,
        ) => number,

        // Handle the response from the RPC server
        private readonly handleResponseMessage: (
            fn: TRPCResponseCallbackFunction,
        ) => void,
    ) {
        /**
         * Handles the response from the server.
         * 
         * @param { RPCResponse }   response
         *  
         * @returns { boolean } 
         */
        this.handleResponseMessage(
            (
                response: RPCResponse,
            ): void => {
                const cb: TCallback | undefined = this.pendingRequests.get(response.id)?.[0];

                if (cb) {
                    this.pendingRequests.delete(response.id);

                    if (response.error) {
                        throw new Error(response.error);
                    }

                    cb(response.result);
                }
            });
    }

    /**
     * Calls a function on the other side.
     * 
     * @param { TMethods } method
     * @param { any } params
     * 
     * @returns { Promise<any> }
     */
    public call(
        originProcessAddress: TProcessAddress,
        method: TMethods,
        ...params: any
    ): Promise<any> {
        const id: number = this.requestId++;

        const rpcRequest: RPCRequest<TMethods> = {
            id,
            originProcessAddress,
            method,
            params,
        };

        this.sendToRPCServer(`${RPC_REQUEST}:${JSON.stringify(rpcRequest)}`);

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, [resolve, reject]);

            setTimeout(() => {
                if (this.pendingRequests.get(id)) {
                    this.pendingRequests.delete(id);
                    reject(new GlobalRPCTimeoutError(method as string));
                }
            }, 5_000);
        });
    }

}
