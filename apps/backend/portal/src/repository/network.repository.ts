import type {
    PrismaClient,
    Network,
} from '@prisma-types/flux';
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
    users: {
        userId: string;
        role: string;
    }[];
}

interface IConnectionHistoryPoint {
    count: number;
    timeslotAt: Date;
}

export class NetworkRepository {

    constructor(
        private readonly _prismaClient: PrismaClient,
    ) {}

    // ****************************************************************************
    // *** Create
    // ****************************************************************************
    /**
     * Creates a new network for the given user.
     * The network ID is derived from the alias (slugified). If the slug is
     * already taken, a short random suffix is appended.
     */
    public async createNetwork(
        {
            userId,
            alias,
        }: {
            userId: string,
            alias: string,
        }
    ): Promise<INetwork_S> {
        const id = await this._generateNetworkId(alias);

        return this._prismaClient
            .network
            .create({
                data: {
                    id,
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

    /**
     * Generates a unique network ID derived from the given alias.
     * The alias is slugified (lowercase alphanumeric and dashes). If the
     * resulting slug is already taken, a short random suffix is appended.
     */
    private async _generateNetworkId(
        alias: string,
    ): Promise<string> {
        /** Maximum total length for a network ID slug. */
        const MAX_ID_LENGTH = 50;
        /** Characters reserved for the separator and the random suffix (e.g. `-a3x7k9`). */
        const SUFFIX_LENGTH = 7;

        const slug = alias
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, MAX_ID_LENGTH)
            || nanoid(10);

        const existing = await this._prismaClient.network.findUnique({
            where: { id: slug },
            select: { id: true },
        });

        if (!existing) {
            return slug;
        }

        return `${slug.slice(0, MAX_ID_LENGTH - SUFFIX_LENGTH)}-${nanoid(6)}`;
    }

    // ****************************************************************************
    // *** Read
    // ****************************************************************************

    /**
     * Returns all network IDs stored in the database.
     */
    public async readAllNetworkIds(
    ): Promise<TNetworkId_S[]> {
        const networks = await this._prismaClient.network.findMany({
            select: { id: true },
        });

        return networks.map((n) => n.id as TNetworkId_S);
    }

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

    public async readConnectionHistory(
        networkId: TNetworkId_S,
        dateInterval: {
            from: Date;
            to: Date;
        },
    ): Promise<{
        agents: IConnectionHistoryPoint[];
        authorities: IConnectionHistoryPoint[];
        channels: IConnectionHistoryPoint[];
    }> {
        const [agents, authorities, channels] = await Promise.all([
            this._prismaClient.connectedAgentsHistory.findMany({
                where: {
                    networkId,
                    timeslotAt: {
                        gte: dateInterval.from,
                        lte: dateInterval.to,
                    },
                },
                orderBy: {
                    timeslotAt: 'asc',
                },
                select: {
                    count: true,
                    timeslotAt: true,
                },
            }),
            this._prismaClient.connectedAuthoritiesHistory.findMany({
                where: {
                    networkId,
                    timeslotAt: {
                        gte: dateInterval.from,
                        lte: dateInterval.to,
                    },
                },
                orderBy: {
                    timeslotAt: 'asc',
                },
                select: {
                    count: true,
                    timeslotAt: true,
                },
            }),
            this._prismaClient.channelsHistory.findMany({
                where: {
                    networkId,
                    timeslotAt: {
                        gte: dateInterval.from,
                        lte: dateInterval.to,
                    },
                },
                orderBy: {
                    timeslotAt: 'asc',
                },
                select: {
                    count: true,
                    timeslotAt: true,
                },
            }),
        ]);

        return {
            agents,
            authorities,
            channels,
        };
    }

    /**
     * Deletes a network if the user is an admin.
     */
    public async deleteNetwork(
        {
            networkId,
            userId,
        }: {
            networkId: TNetworkId_S,
            userId: string,
        },
    ): Promise<void> {
        // Verify the user is an admin of this network before deleting
        const userNetwork = await this._prismaClient.userNetwork.findFirst({
            where: {
                networkId,
                userId,
                role: 'ADMIN',
            },
        });

        if (!userNetwork) {
            throw new Error('Network not found or access denied');
        }

        // Delete related UserNetwork records first (no cascade configured)
        await this._prismaClient.userNetwork.deleteMany({
            where: { networkId },
        });

        await this._prismaClient.network.delete({
            where: { id: networkId },
        });
    }

    /**
     * Converts a Prisma network entity to the internal network representation.
     */
    private convert(
        network: NetworkWithUserNetworks,
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
