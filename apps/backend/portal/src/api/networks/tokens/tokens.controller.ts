import { Elysia, t } from 'elysia';
import { nanoid } from 'nanoid';
import { networkIdValidatorPlugin } from '../plugins';
import { betterAuth } from '../../../_decorators/auth.decorator';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IStoredToken {
    readonly id: string;
    /** The actual token value — never returned by the list endpoint. */
    readonly value: string;
    /** Simulated count of entities still using this token. */
    entityCount: number;
    readonly createdAt: string;
    /** Login/identifier of the user who generated this token. */
    readonly createdBy: string;
    /**
     * ISO timestamp of when this token was demoted from primary.
     * Null while the token is still primary.
     */
    rotatedOutAt: string | null;
}

// ─── Elysia response schemas ─────────────────────────────────────────────────

const tokenMetadataSchema = t.Object({
    id: t.String(),
    index: t.Number(),
    isPrimary: t.Boolean(),
    entityCount: t.Number(),
    createdAt: t.String(),
    createdBy: t.String(),
    rotatedOutAt: t.Union([t.String(), t.Null()]),
});

const revealResponseSchema = t.Object({
    value: t.String(),
});

// ─── In-memory store (replace with DB later) ─────────────────────────────────

const networkTokenMap = new Map<string, IStoredToken[]>();

// ─── Helper ──────────────────────────────────────────────────────────────────

function toMetadata(
    token: IStoredToken,
    index: number,
) {
    return {
        id: token.id,
        index,
        isPrimary: index === 0,
        entityCount: token.entityCount,
        createdAt: token.createdAt,
        createdBy: token.createdBy,
        rotatedOutAt: token.rotatedOutAt,
    };
}

class TokenNotFoundError extends Error {
    status = 404;

    constructor(
        private tokenIndex: number,
    ) {
        super(`Token at index ${tokenIndex} not found.`);
    }
}

class MaximumTokensReachedError extends Error {
    status = 400;

    constructor() {
        super('Maximum of 3 tokens already reached.');
    }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export const networkTokenController = new Elysia({
    prefix: '/api/networks/:networkId/tokens',
})
    .use(betterAuth)

    .use(networkIdValidatorPlugin)

    .error({
        TokenNotFoundError,
        MaximumTokensReachedError,
    })

    /**
     * List tokens for a network (token values are never returned here).
     *
     * GET '/api/networks/:networkId/tokens'
     */
    .get(
        '',
        ({ networkId }) => {
            const tokens = networkTokenMap.get(networkId) ?? [];

            return tokens.map(toMetadata);
        },
        {
            response: t.Array(tokenMetadataSchema),
        },
    )

    /**
     * Generate a new token for the network (max 3).
     * The new token becomes primary; all existing tokens are demoted and receive a rotatedOutAt timestamp.
     *
     * POST '/api/networks/:networkId/tokens'
     */
    .post(
        '',
        ({
            networkId,
            user,
        }) => {
            console.log(`Generating token for network ${networkId}`);

            const tokens = networkTokenMap.get(networkId) ?? [];

            if (tokens.length >= 3) {
                throw new MaximumTokensReachedError();
            }

            const now = new Date().toISOString();

            // Demote all existing tokens: record when they stopped being primary
            const demoted = tokens.map((t) => ({
                ...t,
                rotatedOutAt: t.rotatedOutAt ?? now,
            }));

            const newToken: IStoredToken = {
                id: nanoid(),
                value: `flx_${nanoid(32)}`,
                entityCount: 0,
                createdAt: now,
                createdBy: user.name || user.id,
                rotatedOutAt: null,
            };

            // Prepend so the new token is index 0 (primary)
            networkTokenMap.set(networkId, [newToken, ...demoted]);

            return toMetadata(newToken, 0);
        },
        {
            response: {
                200: tokenMetadataSchema,
                400: t.Object({ message: t.String() }),
            },
            auth: true,
        },
    )

    /**
     * Reveal the actual token value for a specific index.
     * The user must explicitly request this — the value is never in the list response.
     *
     * GET '/api/networks/:networkId/tokens/reveal?tokenIndex=:tokenIndex'
     */
    .get(
        'reveal',
        ({ networkId, query }) => {
            const { tokenIndex } = query;
            const tokens = networkTokenMap.get(networkId) ?? [];
            const token = tokens[tokenIndex];

            if (!token) {
                throw new TokenNotFoundError(tokenIndex);
            }

            return { value: token.value };
        },
        {
            query: t.Object({
                tokenIndex: t.Number(),
            }),
            response: {
                200: revealResponseSchema,
                404: t.Object({ message: t.String() }),
            },
        },
    )

    /**
     * Remove a token by index. The next token (if any) automatically becomes the primary.
     *
     * DELETE '/api/networks/:networkId/tokens?tokenIndex=:tokenIndex'
     */
    .delete(
        '',
        ({ networkId, query }) => {
            const { tokenIndex } = query;
            const tokens = networkTokenMap.get(networkId) ?? [];

            if (tokenIndex < 0 || tokenIndex >= tokens.length) {
                throw new TokenNotFoundError(tokenIndex);
            }

            networkTokenMap.set(
                networkId,
                tokens.filter((_, i) => i !== tokenIndex),
            );

            return { message: `Token at index ${tokenIndex} deleted.` };
        },
        {
            query: t.Object({
                tokenIndex: t.Number(),
            }),
            response: {
                200: t.Object({ message: t.String() }),
                404: t.Object({ message: t.String() }),
            },
        },
    )
    ;
