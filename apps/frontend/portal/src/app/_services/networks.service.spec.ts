import type { INetwork_S } from '@flux/shared/features/networks';
import { sortByAlias } from './networks.service';

const asNetwork = (
    alias: string,
): INetwork_S => ({
    id: alias.toLowerCase(),
    alias,
} as INetwork_S);

describe('sortByAlias', () => {
    it('orders networks alphabetically for the sidebar selector', () => {
        // The order the API happens to return them in — creation order.
        const networks = ['Tailmates', 'Njord', 'uPOSia', 'console-blog', 'biograf', 'Njord-dev']
            .map(asNetwork);

        expect(sortByAlias(networks).map((network) => network.alias)).toEqual([
            'biograf',
            'console-blog',
            'Njord',
            'Njord-dev',
            'Tailmates',
            'uPOSia',
        ]);
    });

    it('does not split the list by casing', () => {
        const networks = ['beta', 'Alpha', 'alpha-2'].map(asNetwork);

        expect(sortByAlias(networks).map((network) => network.alias)).toEqual([
            'Alpha',
            'alpha-2',
            'beta',
        ]);
    });

    it('leaves the input array untouched', () => {
        const networks = ['b', 'a'].map(asNetwork);

        sortByAlias(networks);

        expect(networks.map((network) => network.alias)).toEqual(['b', 'a']);
    });
});
