import { writable } from 'svelte/store';
import { treaty } from '@elysiajs/eden'
import type {
  App
} from '../../../../backend/portal/src/main'
import { isBrowser } from '../utils/is-browser.util';

const dataStore = writable<number | undefined>();
const app = treaty<App>('localhost:3000')

const { data: initialValue } = await app.api['connected-authorities'].get();

dataStore.set(initialValue ?? 0);

if (isBrowser()) {
  let data = initialValue ?? 0;

  setInterval(() => {

    data = (data ?? 0) + 1;
    dataStore.set(data);

  }, 1_000);
}

// Export the store directly
export const connectedAuthorities = dataStore;
