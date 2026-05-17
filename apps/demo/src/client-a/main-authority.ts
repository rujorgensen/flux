import Alpine from 'alpinejs';
import { FluxAuthority } from '@persistica/flux-authority';
import type { TChannelName } from '@flux/shared/types';
import type { TNetworkConnectionState } from '@flux/shared/utils';
import { getFluxUrl } from '../flux-url';
import { getAuthorityKey } from '../auth-settings';
import { getNetworkId } from '../network-id';
import { DEMO_CHANNEL_PASSWORD } from '../definitions';

Alpine.data('fluxAuthority', () => ({
    flux: new FluxAuthority(
        getNetworkId(),
        {
            domain: getFluxUrl(),
        },
    ),
    networkState: <string | null>null,
    authorityLog: <string[]>[],
    log(
        message: string,
    ) {
        const timestamp: string = new Date().toISOString();
        this.authorityLog.unshift(`[${timestamp}] ${message}`);

        if (this.authorityLog.length > 100) {
            this.authorityLog.length = 100;
        }
    },
    async init() {

        console.log('🔑 Registering authority in browser');

        this.flux.onNetworkState((
            networkState: TNetworkConnectionState,
        ) => {
            this.networkState = networkState;
            this.log(`📡 Network state changed to '${networkState}'`);
        });

        try {
            await this.flux.registerAuthority(
                getAuthorityKey(),

                (auth: unknown): Promise<string> => {
                    if ((auth as any).code !== DEMO_CHANNEL_PASSWORD) {
                        this.log('❌ Client rejected – wrong code');
                        return Promise.reject(new Error('Not allowed'));
                    }

                    const userId: string = (auth as any).user ?? 'unknown';
                    this.log(`✅ Client '${userId}' allowed to access the network`);

                    const token = btoa(JSON.stringify({
                        userId,
                        iat: Date.now(),
                    })); // NOTE: btoa is used here for demo purposes only. In production, use a signed JWT.

                    return Promise.resolve(token);
                },

                (
                    channelTopic: TChannelName,
                    identification: string,
                ): Promise<boolean> => {
                    this.log(`🔒 Client '${identification}' joining channel '${channelTopic}'`);
                    return Promise.resolve(true);
                },
            );
        } catch (error) {
            this.log(`❌ Authority registration failed: ${(error as Error).message}`);

            throw error;
        }

        console.log('✅ Demo Authority registered');
        this.log('✅ Authority registered and waiting for clients');
    },
}));
