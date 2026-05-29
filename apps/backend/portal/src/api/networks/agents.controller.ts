import { Elysia, t } from 'elysia';
import { NetworkAgentRedisService } from '@flux/mesh/store/redis/network-agent';
import { getMeshBunRedisConnection } from '@flux/mesh/core/redis';
import {
    type TAddress,
    type TNetworkAgentCountAt,
    isClientId,
} from '@flux/shared/types';
import { networkIdValidatorPlugin } from './plugins';
import { kickSocket } from './kick-socket.util';

const meshRedisConnection = await getMeshBunRedisConnection();
const networkAgentRedisCacheService: NetworkAgentRedisService = new NetworkAgentRedisService(meshRedisConnection.getClient());

class InvalidAgentIdError extends Error {
    status = 400;

    constructor(
    ) {
        super('Invalid agent ID');
    }
}

export const networkAgentController = new Elysia({ prefix: '/api/networks/:networkId/agents' })

    .error({
        InvalidAgentIdError,
    })

    .use(networkIdValidatorPlugin)

    /**
     * '/api/networks/:networkId/agents/count?when={'now'}'
     * '/api/networks/:networkId/agents/count?startDate={startDate}&endDate={endDate}'
     */
    .get('/count', ({ networkId, query }): Promise<TNetworkAgentCountAt> => {
        if (query.when === 'now') {
            return networkAgentRedisCacheService
                .readAgentCount(
                    networkId,
                );
        }

        throw new Error('Only ?when=now is supported as query parameter');
    },
        {
            query: t.Object({
                when: t.Optional(t.Literal('now')),
                startDate: t.Optional(t.Date()),
                endDate: t.Optional(t.Date()),
            })
        })

    /**
     * '/api/networks/:networkId/agents/connected?page={page}&pageSize={pageSize}'
     */
    .get(
        '/connected',
        async ({
            networkId,
            query,
        }) => {
            const page = query.page ?? 1;
            const pageSize = Math.min(query.pageSize ?? 25, 100);
            const all = await networkAgentRedisCacheService
                .readAgents(networkId);
            const total = all.length;
            const start = (page - 1) * pageSize;

            return {
                data: all.slice(start, start + pageSize),
                total,
                page,
                pageSize,
            };
        },
        {
            query: t.Object({
                page: t.Optional(t.Number({ minimum: 1 })),
                pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
            }),
        },
    )

    /**
     * 'DELETE /api/networks/:networkId/agents'
     *
     * Kicks (removes) all connected agents from the network and closes their sockets.
     */
    .delete('', async ({
        networkId,
    }) => {
        const agents = await networkAgentRedisCacheService
            .readAgents(networkId);

        await Promise.all(
            agents.map((agent) => kickSocket(
                'agent',
                agent.address as TAddress,
            )),
        );

        return {
            message: `${agents.length} agent(s) kicked successfully.`,
            count: agents.length,
        };
    })

    /**
     * 'DELETE /api/networks/:networkId/agents/:agentId'
     *
     * Kicks (removes) a connected agent from the network.
     */
    .delete('/:agentId', async ({
        networkId,
        params: { agentId },
    }) => {
        if (!isClientId(agentId)) {
            throw new InvalidAgentIdError();
        }

        const agent = await networkAgentRedisCacheService
            .readAgentByClientId(
                networkId,
                agentId,
            );

        if (agent?.address) {
            await kickSocket(
                'agent',
                agent.address as TAddress,
            );
        }

        return {
            message: `Agent ${agentId} kicked successfully.`,
        };
    }, {

    })
    ;
