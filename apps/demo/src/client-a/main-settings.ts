import Alpine from 'alpinejs';
import { DEFAULT_FLUX_URL, getFluxUrl, setFluxUrl } from '../flux-url';
import {
    DEFAULT_AUTHORITY_OBJECT,
    DEFAULT_AUTHORITY_PASSWORD,
    getAuthorityObject,
    getAuthorityPassword,
    setAuthorityObject,
    setAuthorityPassword,
} from '../auth-settings';

Alpine.data('fluxUrlSettings', () => ({
    fluxUrl: getFluxUrl(),
    saved: false,
    error: '',

    applyUrl() {
        const url = (this.fluxUrl as string).trim() || DEFAULT_FLUX_URL;

        try {
            setFluxUrl(url);
        } catch {
            this.error = 'Invalid URL – please enter a valid URL (e.g. http://localhost:5100)';
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
    authorityPassword: getAuthorityPassword(),
    authorityObject: JSON.stringify(getAuthorityObject(
        'client-a',
    ), null, 2),
    saved: false,
    error: '',

    apply() {
        try {
            const password = (this.authorityPassword as string).trim() || DEFAULT_AUTHORITY_PASSWORD;
            const object = (this.authorityObject as string).trim() || DEFAULT_AUTHORITY_OBJECT;

            // Validate JSON before saving
            JSON.parse(object);

            setAuthorityPassword(password);
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
