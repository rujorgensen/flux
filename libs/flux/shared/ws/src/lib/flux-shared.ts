import type { RPCResponse } from './rpc/rpc.interfaces';

export type TRPCResponseCallbackFunction = (
    response: RPCResponse,
) => void;