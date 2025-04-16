/**
 * Adds domain context when run on the server.
 *  
 * @param path 
 * @param options 
 * @returns 
 */
// export const astroFetch = (path: string, options?: RequestInit) => {
//     const isServer = typeof window === 'undefined';
//     const base = isServer
//         ? import.meta.env.FLUX_PUBLIC_API_BASE_URL
//         : '';

//     return fetch(`${base}${path}`, options);
// };


const isBrowser = typeof window !== 'undefined';
export const apiFetch = (path: string, options?: RequestInit) => {
    const base = isBrowser ? '' : import.meta.env.FLUX_PUBLIC_API_BASE_URL;

    return fetch(`${base}${path}`, options);
};