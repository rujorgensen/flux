import { writable } from 'svelte/store';
import { treaty } from '@elysiajs/eden'
import type {
  App
} from '../../../../backend/portal/src/main'
import { isServer } from '../utils/is-server.util';

const dataStore = writable<number | undefined>();
const app = treaty<App>('localhost:3000')

if (isServer()) {

  app.api['connected-authorities']
    .get()
    .then(({ data }) => {
      dataStore.set(data ?? 0);
    });

} else {
    const { data: initialValue } = await app.api['connected-authorities'].get();
    dataStore.set(initialValue ?? 0);

    let data = initialValue ?? 0;

    setInterval(() => {

      data = (data ?? 0) + 1;
      dataStore.set(data++);
    }, 1_000);
}

// Export the store directly
export const connectedAuthorities = dataStore;
