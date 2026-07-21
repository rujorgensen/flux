/**
 * The taxonomy that decides whether a failed authentication attempt is worth
 * retrying. It lives here rather than in one package because the Agent and the
 * Authority authenticate against the same mesh and must agree on the answer —
 * they previously did not, and an Agent gave up on a network blip that an
 * Authority would have retried through.
 *
 * The split is transient-vs-permanent, not severity:
 *
 * - `RetryableError` — the mesh may answer next time. Unreachable host, DNS
 *   failure, refused connection, 5xx, 429.
 * - Everything else — retrying cannot change the outcome. A bad token stays bad;
 *   a wrong domain stays wrong. These must surface immediately, because a
 *   misconfigured deploy that retries forever looks identical to an outage and
 *   is far harder to diagnose than a fast, loud failure.
 */

export class RetryableError extends Error {}

/**
 * The mesh could not be reached, or answered in a way that suggests it will
 * recover on its own.
 */
export class ConnectionError extends RetryableError {
    constructor(
        message: string,
        public readonly statusCode?: number,
    ) {
        super(message);
        this.name = 'ConnectionError';
    }
}

/**
 * Credentials were rejected. Permanent by design — never retried.
 */
export class AuthenticationError extends Error {
    constructor(
        message: string,
    ) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

/**
 * There is no mesh at this address — almost always a `domain` pointing at the
 * Portal instead of the Mesh. Permanent by design.
 */
export class EndpointNotFoundError extends Error {
    constructor(
        message: string,
    ) {
        super(message);
        this.name = 'EndpointNotFoundError';
    }
}

/**
 * True when the mesh might answer a later attempt.
 */
export const isRetryableConnectionError = (
    error: unknown,
): boolean => error instanceof RetryableError;

/**
 * Whether an HTTP status from the auth endpoint is worth another attempt.
 * 5xx is the mesh being unwell; 429 is it asking us to slow down, not to stop.
 */
export const isRetryableAuthStatus = (
    status: number,
): boolean => (status >= 500) || (status === 429);

/**
 * Wrap a `fetch` failure as retryable. A throw from `fetch` is always transport
 * (DNS, refused, reset, TLS) — the mesh never got to answer, so the attempt says
 * nothing about whether a later one would succeed.
 */
export const asConnectionError = (
    error: unknown,
    origin: string,
): ConnectionError =>
    new ConnectionError(
        `Failed to reach mesh server at ${origin}: ${error instanceof Error ? error.message : 'Unknown connection error'}`,
    );
