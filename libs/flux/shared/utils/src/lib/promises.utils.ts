/**
 * Retries a function until it succeeds or the retry limit is reached, then throws.
 */
export const retryOrThrow = async <T>(
    fn: () => Promise<T>,
    shouldRetry: (err: unknown) => boolean | number,
    options: {
        retries: number,
        delayMs: number,
        onRetry?: (
            attempt: number,
            retries: number,
        ) => void | number;
    },
): Promise<T> => {
    let overrideDelay: number | undefined;

    for (let attempt = 0; attempt <= options.retries; attempt++) {
        try {
            if (attempt > 0) {
                if (options.onRetry) {
                    overrideDelay = options.onRetry(attempt, options.retries) ?? undefined;
                }
            }

            return await fn();
        } catch (err) {
            if ((attempt >= options.retries) || !shouldRetry(err)) {
                throw err;
            }

            if ((options.delayMs > 0) || (overrideDelay && (overrideDelay > 0))) {
                const delay: number = overrideDelay ?? options.delayMs;

                await new Promise(res => setTimeout(
                    res,
                    delay,
                ));
            }
        }
    }

    throw new Error("Retry loop exited unexpectedly.");
};
