import type { Network, PrismaClient } from '@prisma-types/flux';
import { nanoid } from 'nanoid';
import type { TNetworkId_S } from '@flux/shared/types';

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
    user: {
        userId: string;
        role: string;
    }[];
}
export class NetworkRepository {
    constructor(
        private readonly _prismaClient: PrismaClient,
    ) { }

    /**
     * 
     * @param param0
     * 
     * @returns 
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

    public readNetworkBySecretKeyOrThrow(
        secretKey: string,
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

    private convert(
        network: NetworkWithUserNetworks,
    ): INetwork_S {
        return {
            id: network.id as TNetworkId_S,
            alias: network.alias,
            user: network.userNetworks.map((userNetwork) => ({
                userId: userNetwork.userId,
                role: userNetwork.role,
            })),
        };
    }
}
