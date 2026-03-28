import Alpine from 'alpinejs';
import { DEFAULT_FLUX_URL, getFluxUrl, setFluxUrl } from '../flux-url';

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
