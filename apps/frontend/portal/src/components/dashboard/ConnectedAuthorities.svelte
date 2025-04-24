<!-- ConnectedAuthorities.svelte -->
<script lang="ts">
  import { writable } from 'svelte/store';
  import { FluxAgent } from '../../../../../../packages/flux/agent/src';
  import type {
    FluxNetworkChannel,
    FluxNetworkConnection,
  } from '../../../../../../libs/flux/shared/connection/src';
  import { onMount } from 'svelte';

  // Passed by Astro
  export let initialData: number;

  const CODE_TO_ACCESS_NETWORK: string = 'code-to-access-network'; // Key to connect to a network, unknown and irelevant to flux

  const dataStore = writable<number | undefined>();

  dataStore.set(initialData ?? 0);

  onMount(async () => {
    // if (isBrowser()) {
    const fluxAgent = new FluxAgent('rAnD0M-network-id', {
      //         domain?: string,
      //         secretKey?: string; // For encrypting/decrypting packages. Not known to Flux.
      //         retries?: number; // Number of times to retry a failed message
    });

    const fluxNetworkConnection: FluxNetworkConnection =
      await fluxAgent.connect(CODE_TO_ACCESS_NETWORK, 'portal-agent');

    const fluxNetworkChannel: FluxNetworkChannel =
      await fluxNetworkConnection.joinChannel('connected-authorities');

    fluxNetworkChannel.onPublish((message: string) => {
      dataStore.set(Number.parseInt(message, 10));
    });
    //  }
  });
  // Export the store directly
  export const connectedAuthorities = dataStore;
</script>

{#if $connectedAuthorities}
  <strong>{JSON.stringify($connectedAuthorities)}</strong>
{/if}
