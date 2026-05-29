/**
 * Returns true if the set and the value(s) share at least one element.
 */
const hasOverlap = <T>(a: Set<T> | undefined, b?: T[] | T) => a && b ? [...a].some((item: T) => (Array.isArray(b) ? b : [b]).includes(item)) : false;

export const PicoLogger = (() => {
    let allowScopes: Set<string> | '*' | undefined;

    /**
     * Configures the logger with the given scopes.
     */
    const configure = (
        configuration: {
            allowScopes: string[] | '*';
        },
    ) => {
        allowScopes = (configuration.allowScopes === '*') ? '*' : new Set(configuration.allowScopes);
    };

    /**
     * Logs a message if the scope is allowed.
     */
    const log = (
        message: string,
        scopes?: string | string[],
    ): void => {
        if ((allowScopes !== '*') && !hasOverlap(allowScopes, scopes)) {
            return;
        }

        console.log(`[${scopes?.toString()}]\t${message}`);
    };

    /**
     * Logs a warning if the scope is allowed.
     */
    const warn = (
        message: string,
        scopes?: string | string[],
    ): void => {
        if ((allowScopes !== '*') && !hasOverlap(allowScopes, scopes)) {
            return;
        }

        console.warn(`[${scopes?.toString()}]\t${message}`);
    };

    /**
     * Logs an error if the scope is allowed.
     */
    const error = (
        message: string,
        scopes?: string | string[],
    ): void => {
        if ((allowScopes !== '*') && !hasOverlap(allowScopes, scopes)) {
            return;
        }

        console.error(`[${scopes?.toString()}]\t${message}`);
    };

    return {
        configure,
        log,
        warn,
        error,
    };
})();