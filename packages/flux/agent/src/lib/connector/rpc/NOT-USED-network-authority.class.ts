import {
    RPCServer,
} from '@flux/shared/ws';

export class AuthorityClient extends RPCServer<'authorize'> {
    public authorize(
        fn: (
            jwt: unknown,
        ) => boolean,
    ): void {
        super.registerMethod('authorize', fn);
    }
}
