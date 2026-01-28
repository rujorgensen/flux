
import { FluxAuthority } from '@persistica/flux-authority';
import type { TChannelName } from '@flux/shared/types';
import jwt from 'jsonwebtoken';
import { DEMO_CHANNEL_PASSWORD, DEMO_NETWORK_ID } from '../definitions';

const secret = 'your-very-secure-secret'; // keep this secret safe!

// ****************************************************************************
// *** Authority
// ****************************************************************************

console.log('🔑 Registering authority');

const NETWORK_AUTHORITY_KEY: string = 'network-authority-key'; // Key to register an authority, known to flux

const fluxAuthority: FluxAuthority = new FluxAuthority(
    DEMO_NETWORK_ID,
    {
        // p2p encryption
        secretKey: '$Ap~yI,y^:Hsqca',
    },
);

await fluxAuthority
    .registerAuthority(
        NETWORK_AUTHORITY_KEY,
        {
            authorizeNetworkAgent: (
                auth: unknown,
            ): Promise<string> => {
                // Test the agents claim to access network
                if ((<any>auth).code !== DEMO_CHANNEL_PASSWORD) {
                    console.warn(`❌ Client is not allowed to access the network, with auth: ${JSON.stringify(auth)}`);
                    return Promise.reject(new Error('Not allowed'));
                }

                console.log(`✅ Client is allowed to access the network ID: "${DEMO_NETWORK_ID}"`);
                return Promise.resolve(jwt.sign({
                    userId: (<any>auth).user,
                }, secret, { expiresIn: 120_000 }));
            },

            authorizeNetworkChannel: (
                channelTopic: TChannelName,
                identification: string,
            ): Promise<boolean> => {
                console.log(`🔒 A client is attempting to subscribe to topic '${channelTopic}', using identification '${identification}'`);

                console.log(`✅ Client suscribed to channel with topic '${channelTopic}'`);

                return Promise.resolve(true);
            },
        });

console.log('✅ Demo Authority registered');