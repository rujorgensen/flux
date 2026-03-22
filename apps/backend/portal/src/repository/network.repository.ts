import type {
    PrismaClient,
    Network,
} from '@prisma-types/flux';
import { nanoid } from 'nanoid';
import type { TNetworkId_S, TNetworkKey_S } from '@flux/shared/types';

type NetworkWithUserNetworks = Network & {
    userNetworks: {
        userId: string;
        networkId: string;
        role: string;
    }[];
};

export interface INetwork_S {
    id: string;
    alias: string;
    users: {
        userId: string;
        role: string;
    }[];
}
export class NetworkRepository {

    constructor(
        private readonly _prismaClient: PrismaClient,
    ) { }

    // ****************************************************************************
    // *** Create
    // ****************************************************************************
    /**
     * Creates a new network for the given user.
     */
    public createNetwork(
        {
            userId,
            alias,
        }: {
            userId: string,
            alias: string,
        }
    ): Promise<INetwork_S> {
        return this._prismaClient
            .network
            .create({
                data: {
                    alias,
                    secretKey: nanoid(32),
                    userNetworks: {
                        create: {
                            userId,
                            role: 'ADMIN',
                        }
                    },
                },
                include: {
                    userNetworks: {
                        include: {
                            user: true,
                        },
                    },
                },
            })
            .then((network: NetworkWithUserNetworks) => this.convert(network))
            ;
    }

    // ****************************************************************************
    // *** Read
    // ****************************************************************************

    /**
     * Returns all networks for the given user.
     */
    public readUserNetworks(
        userId: string,
    ): Promise<INetwork_S[]> {
        return this._prismaClient
            .network
            .findMany({
                where: {
                    userNetworks: {
                        some: {
                            userId,
                        },
                    },
                },
                include: {
                    userNetworks: {
                        include: {
                            user: true,
                        },
                    },
                },
            })
            .then((networks: NetworkWithUserNetworks[]) => networks.map(this.convert.bind(this)))
            ;
    }

    /**
     * Reads the secret key for a network by its network ID or throws if not found.
     */
    public readNetworkKeyByNetworkIdOrThrow(
        networkId: TNetworkId_S,
    ): Promise<TNetworkKey_S> {
        return this._prismaClient
            .network
            .findUniqueOrThrow({
                where: {
                    id: networkId,
                },
                select: {
                    secretKey: true,
                },
            })
            .then((response: { secretKey: string; }) => response.secretKey as TNetworkKey_S)
            ;
    }

    /**
     * Reads a network by its secret key or throws if not found.
     */
    public readNetworkBySecretKeyOrThrow(
        secretKey: TNetworkKey_S,
    ): Promise<INetwork_S> {
        return this._prismaClient
            .network
            .findUniqueOrThrow({
                where: {
                    secretKey,
                },
                include: {
                    userNetworks: {
                        include: {
                            user: true,
                        },
                    },
                },
            })
            .then((network: NetworkWithUserNetworks) => this.convert(network))
            ;
    }

    /**
     * Converts a Prisma network entity to the internal network representation.
     */
    private convert(
    ): INetwork_S {
        return {
            id: network.id as TNetworkId_S,
            alias: network.alias,
            users: network.userNetworks.map((userNetwork) => ({
                userId: userNetwork.userId,
                role: userNetwork.role,
            })),
        };
    }
}
