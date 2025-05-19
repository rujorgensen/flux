<!-- ConnectedAuthorities.svelte -->
<script lang="ts">
    import { writable } from "svelte/store";
    import type { TNetworkChannelCountAt } from "@flux/shared/types";
    import { onMount } from "svelte";
    import type { FluxAgentNetworkConnection } from "@flux/shared/connection";
    import { onActiveChannelCount } from "../../data/flux/channels.service.fn";

    // Passed by Astro
    export let fluxAgentNetworkConnection: FluxAgentNetworkConnection;
    export let initial: TNetworkChannelCountAt;

    // Export the store directly
    export const activeChannels = writable<TNetworkChannelCountAt>(initial);

    onMount(async () => {
        // Update on new data
        (await onActiveChannelCount(fluxAgentNetworkConnection))(
            activeChannels.set,
        );
    });
</script>

{#if $activeChannels}
    <strong title={$activeChannels.date.toDateString()}>
        {$activeChannels.count}
    </strong>
{/if}

<style>
    strong {
        text-align: right;
        display: block;
    }
</style>
