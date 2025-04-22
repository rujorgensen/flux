export const retry = async <T>(
    fn: () => Promise<T>,
    shouldRetry: (err: unknown) => boolean,
    options: {
        retries: number,
        delayMs: number,
    },
): Promise<T> => {
    let attempt = 0;
    while (true) {
        try {
            if (attempt > 0) {
                console.log(`Retrying... (attempt: ${attempt} of ${options.retries})`);
            }

            return await fn();
        } catch (err) {
            attempt++;
            if ((attempt > options.retries) || !shouldRetry(err)) {
                throw err;
            }

            if (options.delayMs > 0) {
                await new Promise(res => setTimeout(res, options.delayMs));
            }
        }
    }
};
