
import { FluxAuthority } from '@persistica/flux-authority';
import type { TChannelName } from '@flux/shared/types';
import jwt from 'jsonwebtoken';
import { DEMO_CHANNEL_PASSWORD } from '../definitions';
import { getNetworkId } from '../network-id';
import { getAuthorityKey } from '../auth-settings';

const secret = 'your-very-secure-secret'; // keep this secret safe!

// ****************************************************************************
// *** Authority
// ****************************************************************************

console.log('🔑 Registering authority');

const fluxAuthority: FluxAuthority = new FluxAuthority(
    getNetworkId(),
    {
        domain: process.env['FLUX_URL'],
        // p2p encryption
        secretKey: '$Ap~yI,y^:Hsqca',
    },
);

await fluxAuthority
    .registerAuthority(
        getAuthorityKey(),
        (
            auth: unknown,
        ): Promise<string> => {
            // Test the agents claim to access network
            if ((<any>auth).code !== DEMO_CHANNEL_PASSWORD) {
                console.warn(`❌ Client is not allowed to access the network, with auth: ${JSON.stringify(auth)}}`);
                return Promise.reject(new Error('Not allowed'));
            }

            console.log('✅ Client is allowed to access the network');
            return Promise.resolve(jwt.sign({
                userId: (<any>auth).user,
            }, secret, { expiresIn: 120_000 }));
        },

        (
            channelTopic: TChannelName,
            identification: string,
        ): Promise<boolean> => {
            console.log(`🔒 A client is attempting to subscribe to topic '${channelTopic}', using identification '${identification}'`);

            console.log(`✅ Client suscribed to channel with topic '${channelTopic}'`);

            return Promise.resolve(true);
        },
    );

console.log('✅ Demo Authority registered');