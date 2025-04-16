import { isBrowser } from './is-browser.util';

export const isServer = () => !isBrowser()