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

        console.log(message);
    };

    const warn = (
        message: string,
        scopes?: string | string[],
    ): void => {
        if (!hasOverlap(allowScopes, scopes)) {
            return;
        }

        console.warn(message);
    };

    const error = (
        message: string,
        scopes?: string | string[],
    ): void => {
        if (!hasOverlap(allowScopes, scopes)) {
            return;
        }

        console.error(message);
    };

    return {
        configure,
        log,
        warn,
        error,
    };
})();




/*
// Store the original console methods
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
};

// Override console.log with custom behavior
console.log = (...args: any) => {
    // Do something before the original call
    const timestamp = new Date().toISOString();

    // Call the original method with modified arguments
    originalConsole.log(`[${timestamp}] LOG:`, ...args);

    // Do something after the original call if needed
};

// Override console.error with custom behavior
console.error = (...args: any) => {
    const timestamp = new Date().toISOString();
    originalConsole.error(`[${timestamp}] ERROR:`, ...args);

    // You could also add error tracking here
    // sendToErrorTrackingService(args);
};

// Similarly for other methods
console.warn = (...args: any) => {
    const timestamp = new Date().toISOString();
    originalConsole.warn(`[${timestamp}] WARNING:`, ...args);
};

// Example with more advanced functionality
console.info = (...args: any) => {
    // Skip logging in production
    if (process.env.NODE_ENV !== 'production') {
        const timestamp = new Date().toISOString();
        const stack = new Error().stack.split('\n')[2].trim();
        originalConsole.info(`[${timestamp}] (${stack}) INFO:`, ...args);
    }
};
 */
