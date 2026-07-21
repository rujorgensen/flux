/**
 * Retries a function until it succeeds or the retry limit is reached, then throws.
 *
 * `delayMs` is the base delay. Pass `backoffFactor` to grow it per attempt —
 * without one the delay stays flat, which is the historical behaviour and is
 * fine for short bounded waits, but hammers the mesh when `retries` is large.
 */
export const retryOrThrow = async <T>(
    fn: () => Promise<T>,
    shouldRetry: (err: unknown) => boolean | number,
    options: {
        retries: number,
        delayMs: number,
        backoffFactor?: number,
        maxDelayMs?: number,
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

            // An `onRetry` override wins outright: a caller that computed a delay
            // for this specific attempt knows something the policy does not.
            const backedOff: number = Math.min(
                options.maxDelayMs ?? Number.POSITIVE_INFINITY,
                options.delayMs * ((options.backoffFactor ?? 1) ** attempt),
            );
            const delay: number = overrideDelay ?? backedOff;

            if (delay > 0) {
                await new Promise(res => setTimeout(
                    res,
                    delay,
                ));
            }
        }
    }

    throw new Error("Retry loop exited unexpectedly.");
};
