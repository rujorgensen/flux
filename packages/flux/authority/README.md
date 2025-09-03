# Flux Authority
```TypeScript
import { FluxAuthority } from '@persistica/flux-authority';

const IIdentificationString = string & { brand__: 'IdentificationString' };

const fluxAuthority: FluxAuthority = new FluxAuthority(
    'network-id'
);

await fluxAuthority
    .registerAuthority(
        'network-authorization-key',
        
        (
            auth: unknown,
        ): Promise<IIdentificationString> => {
            console.log('🔑 A client is trying to access the network');

            // Test the agent's claim to access network
            if (!validateAuth(auth)) {
                return Promise.reject(new Error('Not allowed, bad agent claim'));
            }

            console.log('✅ Network access authorized');

            return Promise.resolve(jwt.sign({
                user: {
                    allowAllChannels: true,
                },
            }, 'jwt-secret', { expiresIn: 120_000 })) as IIdentificationString;
        },

        // * Authorize channel
        (
            channelTopic: string,
            identification: IIdentificationString,
        ): Promise<boolean> => {

            const agentJWT = jwt.verify(identification, this.FLUX_AUTHORITY_JWT_SECRET) as jwt.JwtPayload;

            console.log(`🔒 A client is attempting to subscribe to channel name '${channelTopic}', using identification '${JSON.stringify(agentJWT.user)}'`);

            // console.error(`✅ Client suscribed to channel with identification`);

            if (validate) {
                if (agentJWT.user.allowAllChannels) {
                    console.log('✅ Agent is allowed on all channels');
                    return Promise.resolve(true);
                }

                console.log('TODO: chcek if this agent is allowed to access the channel');
                return Promise.resolve(false);
            }

            return Promise.resolve(true);
        },
    );

```