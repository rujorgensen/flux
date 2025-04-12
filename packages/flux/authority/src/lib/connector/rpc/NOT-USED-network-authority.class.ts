import {
    RPCServer,
} from '@flux/shared';

export class AuthorityClient extends RPCServer<'authorize'> {
    public authorize(
        fn: (
            jwt: unknown,
        ) => boolean,
    ): void {
        super.registerMethod('authorize', fn);
    }
}
