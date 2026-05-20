import {
    RPCServer,
} from '@flux/shared/ws';

export class AuthorityClient extends RPCServer<'authorizeAgentConnection'> {
    public authorizeAgentConnection(
        fn: (
            jwt: unknown,
        ) => boolean,
    ): void {
        super.registerMethod('authorizeAgentConnection', fn);
    }
}
