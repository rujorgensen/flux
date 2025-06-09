import type { TNetworkId_S } from '@flux/shared/types';
import type { PrismaClient, User } from '@prisma-types/flux';

export type TUserId_S = string & { __brand: 'UserId'; };
export type TEmail_S = string & { __brand: 'Email'; };

type UserWithNetworks = User & {
    userNetworks: {
        networkId: string;
        role: string;
    }[];
};

interface IUserNetwork_S {
    networkId: TNetworkId_S;
    role: string;
}

interface IUser_S {
    id: TUserId_S;
    email: TEmail_S;
    networks: IUserNetwork_S[];
}

export class UserRepository {

    constructor(
        private readonly _prismaClient: PrismaClient,
    ) { }

    public readUserByIdOrThrow(
        userId: TUserId_S,
    ): Promise<IUser_S> {
        return this._prismaClient
            .user
            .findUniqueOrThrow({
                where: {
                    id: userId,
                },
                include: {
                    userNetworks: {
                        select: {
                            networkId: true,
                            role: true,
                        },
                    },
                },
            })
            .then((user: UserWithNetworks) => this.convert(user))
            ;
    }

    public updateUser(
        userId: TUserId_S,
        email: TEmail_S,
    ): Promise<IUser_S> {
        return this._prismaClient
            .user
            .update({
                where: {
                    id: userId,
                },
                data: {
                    email,
                },
                include: {
                    userNetworks: {
                        select: {
                            networkId: true,
                            role: true,
                        },
                    },
                },
            })
            .then((user: UserWithNetworks) => this.convert(user))
            ;
    }

    public deleteUser(
        userId: TUserId_S,
    ): Promise<IUser_S> {
        return this._prismaClient
            .user
            .delete({
                where: {
                    id: userId,
                },
                include: {
                    userNetworks: {
                        select: {
                            networkId: true,
                            role: true,
                        },
                    },
                },
            })
            .then((user: UserWithNetworks) => this.convert(user))
            ;
    }

    private convert(
        user: UserWithNetworks,
    ): IUser_S {
        return {
            id: user.id as TUserId_S,
            email: user.email as TEmail_S,
            networks: user.userNetworks.map((userNetwork) => ({
                networkId: userNetwork.networkId as TNetworkId_S,
                role: userNetwork.role,
            })),
        };
    }
}
