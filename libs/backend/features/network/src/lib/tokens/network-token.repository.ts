import type {
    PrismaClient,
    NetworkToken,
} from '@prisma-types/flux';
import { nanoid } from 'nanoid';
import type {
    TNetworkId_S,
    TNetworkToken_S,
} from '@flux/shared/types';

export type NetworkTokenWithUser = NetworkToken & {
    createdByUserName: string;
};

export class NetworkTokenRepository {

    constructor(
        private readonly _prismaClient: PrismaClient,
    ) {}

    // ****************************************************************************
    // *** Create
    // ****************************************************************************

    /**
     * Creates a new token for the network.
     * Returns the full persisted record including the generated token.
     */
    public async createToken(
        networkId: TNetworkId_S,
        createdByUserId: string,
    ): Promise<NetworkTokenWithUser> {
        const token = await this._prismaClient
            .networkToken
            .create({
                data: {
                    id: nanoid(),
                    networkId,
                    token: `flx_${nanoid(32)}`,
                    createdByUserId,
                },
                include: {
                    createdByUser: {
                        select: {
                            name: true,
                        },
                    },
                },
            });

        return {
            ...token,
            createdByUserName: token.createdByUser.name || 'Unknown',
        };
    }

    // ****************************************************************************
    // *** Read
    // ****************************************************************************

    /**
     * Returns all tokens for a network ordered newest-first (index 0 = primary).
     */
    public async readByNetworkId(
        networkId: TNetworkId_S,
    ): Promise<NetworkTokenWithUser[]> {
        const token = await this._prismaClient
            .networkToken
            .findMany({
                where: { networkId },
                orderBy: { createdAt: 'desc' },
                include: {
                    createdByUser: {
                        select: {
                            name: true,
                        },
                    },
                },
            });

        return token.map((t) => ({
            ...t,
            createdByUserName: t.createdByUser.name || 'Unknown',
        }));
    }

    /**
     * Returns only the plain-text tokens for a network's tokens.
     * Used for validation and Redis cache population.
     */
    public async readTokensByNetworkId(
        networkId: TNetworkId_S,
    ): Promise<TNetworkToken_S[]> {
        const tokens = await this._prismaClient
            .networkToken
            .findMany({
                where: { networkId },
                select: { token: true },
            });

        return tokens.map((t) => t.token as TNetworkToken_S);
    }

    /**
     * Returns the number of tokens for a network.
     */
    public async countByNetworkId(
        networkId: TNetworkId_S,
    ): Promise<number> {
        return this._prismaClient
            .networkToken
            .count({
                where: { networkId },
            });
    }

    /**
     * Finds a single token by its ID.
     */
    public async findById(
        id: string,
    ): Promise<NetworkTokenWithUser | null> {
        const token = await this._prismaClient
            .networkToken
            .findUnique({
                where: { id },
                include: {
                    createdByUser: {
                        select: {
                            name: true,
                        },
                    },
                },
            });

        if (!token) {
            return null;
        }

        return {
            ...token,
            createdByUserName: token.createdByUser.name || 'Unknown',
        };
    }

    // ****************************************************************************
    // *** Update
    // ****************************************************************************

    /**
     * Marks all non-primary tokens as rotated-out as of `now`,
     * leaving only the token with the given `token` untouched.
     */
    public async rotateOutAllExcept(
        networkId: TNetworkId_S,
        token: TNetworkToken_S,
        now: Date,
    ): Promise<void> {
        await this._prismaClient
            .networkToken
            .updateMany({
                where: {
                    networkId,
                    token: {
                        not: token,
                    },
                    rotatedOutAt: null,
                },
                data: {
                    rotatedOutAt: now,
                },
            });
    }

    public async updateNetworkTokens(
        networkId: TNetworkId_S,
        tokens: TNetworkToken_S[],
    ): Promise<void> {
        await this._prismaClient.$transaction(async (transaction) => {
            // Delete all tokens
            await transaction
                .networkToken
                .deleteMany({
                    where: {
                        networkId,
                    },
                });

            // Upsert current valid tokens to ensure they exist
            for (const token of tokens) {
                await transaction
                    .networkToken
                    .upsert({
                        where: { token },
                        create: {
                            id: nanoid(),
                            networkId,
                            token,
                            createdByUserId: 'system', // or pass as parameter if needed
                        },
                        update: {}, // no updates needed, just ensure existence
                    });
            }

        });

    }

    // ****************************************************************************
    // *** Delete
    // ****************************************************************************

    /**
     * Deletes a single network token.
     */
    public async deleteNetworkToken(
        networkId: TNetworkId_S,
        token: TNetworkToken_S,
    ): Promise<void> {
        await this._prismaClient
            .networkToken
            .delete({
                where: {
                    networkId,
                    token: token,
                },
            });
    }
}
