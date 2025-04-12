
import { TChannelTopic } from '../../lib/channel/channel.type';
import { FluxAgent } from '../../lib/flux';
import { TNetworkId_S } from '@flux/shared';
import jwt from 'jsonwebtoken';

const secret = 'your-very-secure-secret'; // keep this secret safe!

// ****************************************************************************
// *** Authority
// ****************************************************************************

console.log('🔑 Registering authority');

const CODE_TO_ACCESS_NETWORK: any = 'code-to-access-network'; // Key to connect to a network, unknown and irelevant to flux
const NETWORK_AUTHORITY_KEY: string = 'network-authority-key'; // Key to register an authority, known to flux

const flux1: FluxAgent = new FluxAgent(
    'network-id' as unknown as TNetworkId_S,
    {
        // p2p encryption
        secretKey: '$Ap~yI,y^:Hsqca',
    },
);

await flux1
    .registerAuthority(
        NETWORK_AUTHORITY_KEY,
        (
            auth: unknown,
        ): Promise<string> => {
            // Test the agents claim to access network
            if (
                ((auth as any).code !== CODE_TO_ACCESS_NETWORK)
            ) {
                return Promise.reject('Not allowed');
            }

            // console.log('✅ Network access authorized');
        
            return Promise.resolve(jwt.sign({
                userId: (<any>auth).user,
            }, secret, { expiresIn: 120_000 }));
        },

        (
            channelTopic: TChannelTopic,
            identification: string,
        ): Promise<boolean> => {

            console.log(`🔒 A client is trying to subscribe to topic '${channelTopic}', using identification '${identification}'`);

            console.log(`✅ Client suscribed to channel with topic '${channelTopic}'`);
            
            return Promise.resolve(true);
        },
    );

/*
 
export const verifyTokenOrThrow = (
token: string,
// callback?: VerifyCallback<JwtPayload | string>,
): object => {
try {
    const decoded = jwt.verify(token, secret,);

    return decoded as any;
} catch (err) {
    console.error('Invalid or expired token', (<any>err).message);

    throw new Error('Invalid or expired token');
}
};

*/