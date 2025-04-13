import {
    RPCServer,
} from '@flux/shared/types';

export class AuthorityClient extends RPCServer<'authorize'> {
    public authorize(
        fn: (
            jwt: unknown,
        ) => boolean,
    ): void {
        super.registerMethod('authorize', fn);
    }
}
