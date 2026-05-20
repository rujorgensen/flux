export const DEFAULT_AUTHORITY_PASSWORD = 'code-to-access-network';
export const DEFAULT_NETWORK_ACCESS_TOKEN = 'network-access-token';

export const DEFAULT_AUTHORITY_OBJECT = JSON.stringify(
    {
        code: DEFAULT_AUTHORITY_PASSWORD,
        user: 'client-a',
    },
    null,
    2,
);

const AUTHORITY_OBJECT_KEY = 'flux_authority_object';
const AUTHORITY_KEY_STORAGE_KEY = 'flux_authority_key';

export const getAuthorityKey = (): string =>
    localStorage.getItem(AUTHORITY_KEY_STORAGE_KEY) ?? DEFAULT_NETWORK_ACCESS_TOKEN;

export const setAuthorityKey = (
    password: string,
): void => {
    localStorage.setItem(AUTHORITY_KEY_STORAGE_KEY, password);
};

export const getAuthorityObject = (
    clientName: string,
): unknown => {
    const stored = localStorage.getItem(AUTHORITY_OBJECT_KEY);

    if (!stored) {
        return {
            code: DEFAULT_AUTHORITY_PASSWORD,
            user: clientName,
        };
    }

    return JSON.parse(stored);
};

export const setAuthorityObject = (
    json: string,
): void => {
    JSON.parse(json); // validate JSON before storing
    localStorage.setItem(AUTHORITY_OBJECT_KEY, json);
};
