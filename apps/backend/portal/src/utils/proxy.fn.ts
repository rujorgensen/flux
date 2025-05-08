
/**
 * 
 * @param param
 * @returns 
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