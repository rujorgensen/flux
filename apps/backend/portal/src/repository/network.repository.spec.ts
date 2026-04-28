import { describe, expect, it, mock } from 'bun:test';
import { NetworkRepository } from './network.repository';

describe('NetworkRepository', () => {
    it('reads connection history in ascending order within date interval', async () => {
        const agents = [{ count: 2, timeslotAt: new Date('2026-01-01T10:00:00.000Z') }];
        const authorities = [{ count: 1, timeslotAt: new Date('2026-01-01T10:00:00.000Z') }];
        const channels = [{ count: 5, timeslotAt: new Date('2026-01-01T10:00:00.000Z') }];

        const connectedAgentsHistoryFindMany = mock(async () => agents);
        const connectedAuthoritiesHistoryFindMany = mock(async () => authorities);
        const channelsHistoryFindMany = mock(async () => channels);

        const repository = new NetworkRepository({
            connectedAgentsHistory: {
                findMany: connectedAgentsHistoryFindMany,
            },
            connectedAuthoritiesHistory: {
                findMany: connectedAuthoritiesHistoryFindMany,
            },
            channelsHistory: {
                findMany: channelsHistoryFindMany,
            },
        } as never);

        const from = new Date('2026-01-01T00:00:00.000Z');
        const to = new Date('2026-01-01T23:59:59.000Z');
        const result = await repository.readConnectionHistory(
            'network-1' as never,
            {
                from,
                to,
            },
        );

        expect(connectedAgentsHistoryFindMany).toHaveBeenCalledWith({
            where: {
                networkId: 'network-1',
                timeslotAt: {
                    gte: from,
                    lte: to,
                },
            },
            orderBy: {
                timeslotAt: 'asc',
            },
            select: {
                count: true,
                timeslotAt: true,
            },
        });
        expect(connectedAuthoritiesHistoryFindMany).toHaveBeenCalled();
        expect(channelsHistoryFindMany).toHaveBeenCalled();
        expect(result).toEqual({
            agents,
            authorities,
            channels,
        });
    });
});
