import { writable } from 'svelte/store';
import { treaty } from '@elysiajs/eden'
import type {
  App
} from '../../../../backend/portal/src/main'
import { isBrowser } from '../utils/is-browser.util';
import type { FluxNetworkChannel, FluxNetworkConnection } from '../../../../../libs/flux/shared/connection/src';
import { FluxAgent } from '../../../../../packages/flux/agent/src';
const CODE_TO_ACCESS_NETWORK: string = 'code-to-access-network'; // Key to connect to a network, unknown and irelevant to flux

const dataStore = writable<number | undefined>();
const app = treaty<App>('localhost:3000')

const { data: initialValue } = await app.api['connected-authorities'].get();

dataStore.set(initialValue ?? 0);

if (isBrowser()) {
  let data = initialValue ?? 0;
  
  const fluxAgent = new FluxAgent(
    'network-id',
    {
      //         domain?: string,
      //         secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
      //         retries?: number; // Number of times to retry a failed message
    },
  );

  const fluxNetworkConnection: FluxNetworkConnection = await fluxAgent
    .connect(
      CODE_TO_ACCESS_NETWORK,
      'portal-agent',
    );

  const fluxNetworkChannel: FluxNetworkChannel = await fluxNetworkConnection
    .joinChannel('connected-authorities');

  fluxNetworkChannel
    .onPublish((message: string) => {
      dataStore.set(Number.parseInt(message, 10));
    });
}

// Export the store directly
export const connectedAuthorities = dataStore;
