const hasOverlap = <T>(a: Set<T> | undefined, b?: T[] | T) => a && b ? [...a].some((item: T) => (Array.isArray(b) ? b : [b]).includes(item)) : false;

export const PicoLogger = (() => {
    let allowScopes: Set<string> | undefined;

    const configure = (
        configuration: {
            allowScopes: string[];
        },
    ) => {
        allowScopes = new Set(configuration.allowScopes);
    };

    const log = (
        message: string,
        scopes?: string | string[],
    ): void => {
        if (!hasOverlap(allowScopes, scopes)) {
            return;
        }

        console.log(`[${scopes}]\t${message}`);
    };

    const warn = (
        message: string,
        scopes?: string | string[],
    ): void => {
        if (!hasOverlap(allowScopes, scopes)) {
            return;
        }

        console.warn(`[${scopes}]\t${message}`);
    };

    const error = (
        message: string,
        scopes?: string | string[],
    ): void => {
        if (!hasOverlap(allowScopes, scopes)) {
            return;
        }

        console.error(`[${scopes}]\t${message}`);
    };

    return {
        configure,
        log,
        warn,
        error,
    };
})();