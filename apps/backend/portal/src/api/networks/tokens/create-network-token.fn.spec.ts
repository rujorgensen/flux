import {
    describe,
    expect,
    it,
    mock,
} from 'bun:test';
import { createNetworkToken } from './create-network-token.fn';

describe('createNetworkToken', () => {

    it('uses the authenticated user id when creating a token', async () => {
        const countByNetworkId = mock(async () => 0);
        const createToken = mock(async () => ({
            id: 'token-1',
            networkId: 'network-1',
            token: 'flx_token',
            createdAt: new Date('2026-05-17T00:00:00.000Z'),
            createdByUserId: 'user-1',
            createdByUserName: 'Administrator',
            rotatedOutAt: null,
        }));
        const rotateOutAllExcept = mock(async () => undefined);

        const result = await createNetworkToken({
            networkId: 'network-1' as never,
            user: {
                id: 'user-1',
            },
            serviceProviders: {
                networkTokenService: {
                    countByNetworkId,
                    createToken,
                    rotateOutAllExcept,
                },
            },
        });

        expect(createToken).toHaveBeenCalledWith(
            'network-1',
            'user-1',
        );
        expect(rotateOutAllExcept).toHaveBeenCalledWith(
            'network-1',
            'flx_token',
            expect.any(Date),
        );
        expect(result).toEqual({
            id: 'token-1',
            index: 0,
            isPrimary: true,
            entityCount: -1,
            createdAt: '2026-05-17T00:00:00.000Z',
            createdBy: 'Administrator',
            rotatedOutAt: null,
        });
    });
});
