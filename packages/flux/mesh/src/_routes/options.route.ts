/**
 * Standard CORS response.
 * 
 * @returns { Response } A 204 No Content response with CORS headers
 */
export const OPTIONS_RESPONSE = () =>
    new Response(null, {
        status: 204, // "204 No Content"
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-flux-content-type, Set-Cookie',
        },
    });
