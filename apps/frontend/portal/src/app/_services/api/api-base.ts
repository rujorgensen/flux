import { isDevMode } from '@angular/core';

/**
 * The fully-qualified base URL of the backend API.
 * Used both for Eden Treaty and for browser APIs (e.g. EventSource) that require a full URL.
 */
export const apiBaseUrl: string = isDevMode()
    ? 'http://localhost:3000'
    : 'https://persistica.io';
