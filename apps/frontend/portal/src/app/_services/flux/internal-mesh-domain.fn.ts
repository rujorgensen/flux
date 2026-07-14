/**
 * Resolves the domain of the Portal's internal, self-hosted mesh.
 *
 * Local development connects directly to the mesh server on its port. A deployed
 * browser reaches it through a dedicated subdomain (`internal-mesh.<host>`) that
 * Caddy reverse-proxies to the internal mesh server; the mesh port itself is
 * never published externally.
 *
 * Mirrors `resolveFluxDomain` in `flux-domain.component.ts` (which derives the
 * public mesh as `mesh.<host>`).
 */
interface IInternalMeshLocation {
    hostname: string;
    origin: string;
    protocol: string;
}

const INTERNAL_MESH_SERVER_PORT: number = 5_101;
// The subdomain label prepended to the base domain, e.g. `internal-mesh.persistica.io`.
// Change this single constant to rename the endpoint.
const INTERNAL_MESH_SUBDOMAIN: string = 'internal-mesh';
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

    // Derive `internal-mesh.<base-domain>` from the current host, mirroring how
    // `resolveFluxDomain` derives `mesh.<base-domain>`.
    const hostnameParts: string[] = location.hostname.split('.');
    const internalMeshHostname: string = hostnameParts.length > 2
        ? [INTERNAL_MESH_SUBDOMAIN, ...hostnameParts.slice(1)].join('.')
        : `${INTERNAL_MESH_SUBDOMAIN}.${location.hostname}`;

    return `${location.protocol}//${internalMeshHostname}`;
}
