<!-- ConnectedAuthorities.svelte -->
<script lang="ts">
  import { writable } from 'svelte/store';
  //import { apiFetch } from '../../utils/fetch.util';
  const dataStore = writable<number | undefined>();

  // import { onMount } from "svelte";

  // dataStore.set();
  let val = 0;
  // Fetch initial data
  // apiFetch('api/ping')
  //   .then((res) => res.text())
  //   .then((initialData) => {
  //     console.log('[initialData]', initialData);
  //     val = 23;
  //     dataStore.set(val);
  //   })
  //   .catch((err) => {
  //     console.error('Error fetching initial data:', err);
  //     // dataStore.set({ error: 'Failed to fetch initial data' });
  //   });

  setInterval(() => {
    dataStore.set(val++);
  }, 1_000);
  // onMount(async () => {
  //   // const socket = new WebSocket('wss://example.com');

  //   // socket.addEventListener('message', (event) => {
  //   //   const newData = JSON.parse(event.data);

  //   //   dataStore.update(current => ({
  //   //     ...current,
  //   //     ...newData
  //   //   }));
  //   // });

  //   //    return () => socket.close();
  // });

  // Export the store directly

  export const dataUsage = dataStore;
</script>

{#if $dataUsage}
  <strong>{JSON.stringify($dataUsage)}</strong>
{/if}
