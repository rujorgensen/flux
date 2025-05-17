export type TAgentOwnUId = string & { __brand: 'AgentOwnUId'; };

/**
 * Validates a clientUID or throws an error if it is invalid.
 * 
 * @param { string } clientOwnUID
 * 
 * @returns { boolean }
 */
export const validateClientUIDOrThrow = (
    clientOwnUID: string,
): clientOwnUID is TAgentOwnUId => {
    if (!/^[A-Za-z0-9-]+$/.test(clientOwnUID)) {
        throw new Error('UID can only contain letters, numbers and dashes (\'-\')');
    }

    if (clientOwnUID.length > 50) {
        throw new Error('UID cannot be longer than 50 characters');
    }

    return true;
};