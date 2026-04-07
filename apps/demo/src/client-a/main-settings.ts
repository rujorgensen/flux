import Alpine from 'alpinejs';
import { DEFAULT_FLUX_URL, getFluxUrl, setFluxUrl } from '../flux-url';
import {
    DEFAULT_AUTHORITY_KEY,
    DEFAULT_AUTHORITY_OBJECT,
    DEFAULT_AUTHORITY_PASSWORD,
    getAuthorityKey,
    getAuthorityObject,
    setAuthorityKey,
    setAuthorityObject,
} from '../auth-settings';
import { DEFAULT_NETWORK_ID, getNetworkId, setNetworkId } from '../network-id';

Alpine.data('fluxUrlSettings', () => ({
    fluxUrl: getFluxUrl(),
    networkId: getNetworkId() as string,
    saved: false,
    error: '',

    applyUrl() {
        const url = (this.fluxUrl as string).trim() || DEFAULT_FLUX_URL;
        const networkId = (this.networkId as string).trim() || DEFAULT_NETWORK_ID;

        try {
            setFluxUrl(url);
        } catch {
            this.error = 'Invalid URL – please enter a valid URL (e.g. http://localhost:5100)';
            return;
        }

        try {
            setNetworkId(networkId);
        } catch {
            this.error = 'Invalid Network ID – please enter a non-empty Network ID';
            return;
        }

        this.error = '';
        this.saved = true;
        setTimeout(
            () => location.reload(),
            500,
        );
    },
}));

Alpine.data('fluxAuthSettings', () => ({
    authorityKey: getAuthorityKey(),
    authorityObject: JSON.stringify(getAuthorityObject(
        'client-a',
    ), null, 2),
    saved: false,
    error: '',

    apply() {
        try {
            const key = (this.authorityKey as string).trim() || DEFAULT_AUTHORITY_KEY;
            const object = (this.authorityObject as string).trim() || DEFAULT_AUTHORITY_OBJECT;

            // Validate JSON before saving
            JSON.parse(object);

            setAuthorityKey(key);
            setAuthorityObject(object);
        } catch {
            this.error = 'Invalid JSON - please enter a valid JSON object';
            return;
        }

        this.error = '';
        this.saved = true;
        setTimeout(
            () => location.reload(),
            500,
        );
    },
}));
