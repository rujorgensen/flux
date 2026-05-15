/**
 * The class to handling the *called* side of the RPC.
 */
import type { RPCRequest, RPCResponse } from './rpc.interfaces.ts';

type TCallback = (...args: any) => any;

export class RPCServer<TMethodName extends string> {
    private readonly methods: Map<TMethodName, TCallback> = new Map();

    /**
     * Registers a method to be called by the client.
     */
    public registerMethod(
        methodName: TMethodName,
        fn: TCallback,
    ): void {
        const existingMethod: TCallback | undefined = this.methods.get(methodName);

        if (existingMethod && (existingMethod !== fn)) {
            throw new Error(`Method '${methodName}' already registered`);
        }

        this.methods.set(methodName, fn);
    }

    /**
     * Handles the request from the client.
     */
    public async handleMessage(
        request: RPCRequest<TMethodName>,
        sendToRPCClient: (
            data: RPCResponse,
        ) => void,
    ): Promise<void> {

        const response: RPCResponse = {
            id: request.id,
            rpcProcessAddress: request.originProcessAddress,
            result: null,
        };

        const method: TCallback | undefined = this.methods.get(request.method);

        if (method) {
            try {
                response.result = await method(...request.params);
            } catch (error) {
                response.error = (error as Error).message;
            }
        } else {
            response.error = `Method '${request.method}' not found`;
        }

        // Send back the response to the client
        sendToRPCClient(response);
    }
}
