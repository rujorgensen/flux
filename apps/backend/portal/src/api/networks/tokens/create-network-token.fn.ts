import type {
    TNetworkId_S,
    TNetworkToken_S,
} from '@flux/shared/types';
import type { ITokenMetaData_S } from '../../../../../../../libs/flux/shared/types/src/lib/network.type';
import type { NetworkTokenWithUser } from '../../../../../../../libs/backend/features/network/src/lib/tokens/network-token.repository';

// ****************************************************************************
// *** Metadata
// ****************************************************************************

export const toMetadata = (
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

export class MaximumTokensReachedError extends Error {
    status = 400;

    constructor(
    ) {
        super('Maximum of 3 tokens already reached. Please delete an existing token before creating a new one.');
    }
}

type ICreateNetworkTokenParams = {
    networkId: TNetworkId_S;
    user: {
        id: string;
    };
    serviceProviders: {
        networkTokenService: {
            countByNetworkId(
                networkId: TNetworkId_S,
            ): Promise<number>;
            createToken(
                networkId: TNetworkId_S,
                createdByUserId: string,
            ): Promise<NetworkTokenWithUser>;
            rotateOutAllExcept(
                networkId: TNetworkId_S,
                token: TNetworkToken_S,
                now: Date,
            ): Promise<void>;
        };
    };
};

// ****************************************************************************
// *** Create token
// ****************************************************************************

export const createNetworkToken = async ({
    networkId,
    user,
    serviceProviders,
}: ICreateNetworkTokenParams): Promise<ITokenMetaData_S> => {
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
            user.id,
        );

    await serviceProviders
        .networkTokenService
        .rotateOutAllExcept(
            networkId,
            newToken.token as TNetworkToken_S,
            now,
        );

    return toMetadata(newToken, 0);
};
