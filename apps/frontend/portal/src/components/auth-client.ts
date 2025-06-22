import { createAuthClient } from 'better-auth/svelte';

const baseURL = import.meta.env.PROD
    ? undefined
    : 'http://localhost:3001';

export const authClient = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL,
});

export type Session = (typeof authClient.$Infer.Session)['user'];