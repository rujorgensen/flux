
/**
 * Creates a reverse proxy handler to the given target URL.
 */
const proxy = (
    proxyTo: string = 'http://localhost:3001',
) => async ({ request }: {
    request: Bun.BunRequest,
}) => {
        const original = new URL(request.url);

        return await fetch(
            `${proxyTo}${original.pathname}`,
            {
                headers: request.headers,
            },
        );
    };