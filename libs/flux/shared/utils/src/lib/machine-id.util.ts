export type TFluxClientUID = string & { __brand: 'flux-client-uid'; };

// Make TypeScript happy
declare global {
    var __flux_client_id: TFluxClientUID | null;
}

/**
 * Validates that the machine UID is a valid string.
 */
export const validateMachineUID = (
    machineUID: unknown,
): machineUID is TFluxClientUID => {
    if (typeof machineUID !== 'string') {
        console.warn('Machine UID must be a string');
        return false;
    }

    if (machineUID.length < 5) {
        console.warn('Machine UID too short');
        return false;
    }

    if (machineUID.length > 50) {
        console.warn('Machine UID too long');
        return false;
    }

    return true;
};

/**
 * Returns the machine UID or NULL.
 * 
 * NB! node-machine-id' turned out to fail catastrophically on non-bun/node environments.
 */
export const getMachineUID = async (
): Promise<TFluxClientUID | null> => {
    if (typeof globalThis !== 'object') {
        throw new Error('Flux can only be used in an environment with globalThis');
    }

    if (globalThis.__flux_client_id !== null) {
        console.log('[flux-client] Reusing existing id');
        return globalThis.__flux_client_id as unknown as TFluxClientUID;
    }

    globalThis.__flux_client_id = null;
    return globalThis.__flux_client_id as unknown as TFluxClientUID;
};
