export const DEFAULT_AUTHORITY_PASSWORD = 'code-to-access-network';

export const DEFAULT_AUTHORITY_OBJECT = JSON.stringify(
    {
        code: DEFAULT_AUTHORITY_PASSWORD,
        user: 'client-a',
    },
    null,
    2,
);

const AUTHORITY_PASSWORD_KEY = 'flux_authority_password';
const AUTHORITY_OBJECT_KEY = 'flux_authority_object';

export const getAuthorityPassword = (): string =>
    localStorage.getItem(AUTHORITY_PASSWORD_KEY) ?? DEFAULT_AUTHORITY_PASSWORD;

export const setAuthorityPassword = (
    password: string,
): void => {
    localStorage.setItem(AUTHORITY_PASSWORD_KEY, password);
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
