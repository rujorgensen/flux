
/**
 * Creates a proxy function that forwards requests to another server
 * 
 * @param proxyTo URL to proxy requests to, defaults to http://localhost:3001
 * @returns Async function that handles proxying the request
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