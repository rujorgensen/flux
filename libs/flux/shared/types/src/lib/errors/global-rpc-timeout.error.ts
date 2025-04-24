/**
 * An RPC request timed out without response.
 */

export class GlobalRPCTimeoutError extends Error {
    constructor(
        method: string,
    ) {
        super(`Timeout waiting for RPC method response '${method}'`);
        this.name = 'GlobalRPCTimeoutError';
    }
}
