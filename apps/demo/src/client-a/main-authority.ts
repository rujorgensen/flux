import Alpine from 'alpinejs';
import { FluxAuthority } from '@persistica/flux-authority';
import type { TChannelName } from '@flux/shared/types';
import type { TNetworkConnectionState } from '@flux/shared/utils';
import { getFluxUrl } from '../flux-url';
import { getAuthorityKey, getAuthorityPassword } from '../auth-settings';
import { getNetworkId } from '../network-id';

Alpine.data('fluxAuthority', () => ({
    flux: new FluxAuthority(
        getNetworkId(),
        {
            domain: getFluxUrl(),
        },
    ),
    networkState: <string | null>null,
    authorityLog: <string[]>[],
    async init() {
        console.log('🔑 Registering authority in browser');

        this.flux.onNetworkState((
            networkState: TNetworkConnectionState,
        ) => {
            this.networkState = networkState;
        });

        await this.flux.registerAuthority(
            getAuthorityKey(),

            (auth: unknown): Promise<string> => {
                const authorityPassword = getAuthorityPassword();

                if ((auth as any).code !== authorityPassword) {
                    this.authorityLog.unshift(`❌ Client rejected – wrong code`);
                    return Promise.reject(new Error('Not allowed'));
                }

                const userId: string = (auth as any).user ?? 'unknown';
                this.authorityLog.unshift(`✅ Client '${userId}' allowed to access the network`);

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
                this.authorityLog.unshift(`🔒 Client '${identification}' joining channel '${channelTopic}'`);
                return Promise.resolve(true);
            },
        );

        console.log('✅ Demo Authority registered');
    },
}));
