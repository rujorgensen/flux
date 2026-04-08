export const DEFAULT_FLUX_URL = 'http://localhost:5100';

const STORAGE_KEY = 'flux_url';

export const getFluxUrl = (

): string => localStorage.getItem(STORAGE_KEY) ?? DEFAULT_FLUX_URL;

export const setFluxUrl = (
    url: string,
): void => {
    new URL(url); // throws if invalid
    localStorage.setItem(STORAGE_KEY, url);
};
