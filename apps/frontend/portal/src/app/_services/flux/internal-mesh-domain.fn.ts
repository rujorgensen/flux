/**
 * Resolves the domain of the Portal's internal, self-hosted mesh.
 *
 * Local development connects directly to the mesh server on its port. A deployed
 * browser reaches it same-origin through Caddy on the `/internal-mesh` path
 * (Caddy strips the prefix before proxying to the internal mesh server, whose
 * port is never published externally).
 *
 * Same-origin is deliberate: the SDK's `connect()` first does an HTTP fetch to
 * `/auth/network-client`, and a cross-origin endpoint (e.g. a subdomain) would
 * force a CORS preflight that fails once the fetch carries credentials. Serving
 * the mesh under the Portal's own origin avoids CORS entirely.
 */
interface IInternalMeshLocation {
    origin: string;
    protocol: string;
    hostname: string;
}

const INTERNAL_MESH_SERVER_PORT: number = 5_101;
// Same-origin path prefix Caddy proxies to the internal mesh (prefix stripped).
const INTERNAL_MESH_PATH: string = '/internal-mesh';
const DEFAULT_INTERNAL_MESH_DOMAIN: string = `http://localhost:${INTERNAL_MESH_SERVER_PORT}`;

function isLocalHostname(
    hostname: string,
): boolean {
    return hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname === '::1'
        || hostname === '[::1]';
}

export function resolveInternalMeshDomain(
    location: IInternalMeshLocation | undefined,
): string {
    if (!location) {
        return DEFAULT_INTERNAL_MESH_DOMAIN;
    }

    if (isLocalHostname(location.hostname)) {
        const normalizedHostname: string = location.hostname === '::1'
            ? '[::1]'
            : location.hostname;

        return `${location.protocol}//${normalizedHostname}:${INTERNAL_MESH_SERVER_PORT}`;
    }

    return `${location.origin}${INTERNAL_MESH_PATH}`;
}
