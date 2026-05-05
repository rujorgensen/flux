import { Elysia, t } from 'elysia';
import { networkIdValidatorPlugin } from '../plugins';
import { betterAuth } from '../../../_decorators/auth.decorator';
import { networkDecorator } from '../../../_decorators/network-service.decorator';
import { TNetworkToken_S } from '@flux/shared/types';
import { ITokenMetaData_S } from '../../../../../../../libs/flux/shared/types/src/lib/network.type';
import { NetworkTokenWithUser } from '../../../../../../../libs/backend/features/network/src/lib/tokens/network-token.repository';

// ****************************************************************************
// *** Elysia response schemas
// ****************************************************************************

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

// ****************************************************************************
// *** Helpers
// ****************************************************************************

const toMetadata = (
    token: NetworkTokenWithUser,
    index: number,
): ITokenMetaData_S => ({
    id: token.id,
    index,
    isPrimary: index === 0,
    entityCount: -1, // TODO
    createdAt: token.createdAt.toISOString(),
    createdBy: token.createdByUserName,
    rotatedOutAt: token.rotatedOutAt?.toISOString() ?? null,
});

class TokenNotFoundError extends Error {
    status = 404;

    constructor(
        tokenIndex: number,
    ) {
        super(`Token at index ${tokenIndex} not found.`);
    }
}

class MaximumTokensReachedError extends Error {
    status = 400;

    constructor(
    ) {
        super('Maximum of 3 tokens already reached. Please delete an existing token before creating a new one.');
    }
}

// ****************************************************************************
// *** Network Token Controller
// ****************************************************************************

export const networkTokenController = new Elysia({
    prefix: '/api/networks/:networkId/tokens',
})
    .use(betterAuth)

    .use(networkIdValidatorPlugin)
    .use(networkDecorator)

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
        async ({
            networkId,
            serviceProviders,
        }): Promise<ITokenMetaData_S[]> => {
            const tokens = await serviceProviders
                .networkTokenService
                .readByNetworkId(networkId);

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
        async ({
            networkId,
            user,
            serviceProviders,
        }): Promise<ITokenMetaData_S> => {
            console.log(`Generating token for network ${networkId}`);

            const existingCount = await serviceProviders
                .networkTokenService
                .countByNetworkId(networkId);

            if (existingCount >= 3) {
                throw new MaximumTokensReachedError();
            }

            const now = new Date();

            const newToken = await serviceProviders
                .networkTokenService
                .createToken(
                    networkId,
                    user.name || user.id,
                );

            // Demote all older tokens
            await serviceProviders
                .networkTokenService
                .rotateOutAllExcept(
                    networkId,
                    newToken.token as TNetworkToken_S,
                    now,
                );

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
        async ({
            networkId,
            query,
            serviceProviders,
        }) => {
            const { tokenIndex } = query;

            const tokens = await serviceProviders
                .networkTokenService
                .readByNetworkId(networkId);

            const token = tokens.at(tokenIndex);

            if (!token) {
                throw new TokenNotFoundError(tokenIndex);
            }

            return {
                value: token.token,
            };
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
        async ({
            networkId,
            query,
            serviceProviders,
        }) => {
            const { tokenIndex } = query;
            const tokens = await serviceProviders
                .networkTokenService
                .readByNetworkId(
                    networkId,
                );
            const token = tokens.at(tokenIndex);

            if ((tokenIndex < 0) || !token) {
                throw new TokenNotFoundError(tokenIndex);
            }


            await serviceProviders
                .networkTokenService
                .deleteNetworkToken(
                    networkId,
                    token.token as TNetworkToken_S,
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

