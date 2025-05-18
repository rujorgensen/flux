<!-- ConnectedAuthorities.svelte -->
<script lang="ts">
    import { writable } from "svelte/store";
    import type {
        TNetworkAgentCountAt,
        TNetworkId_S,
    } from "@flux/shared/types";
    import { onMount } from "svelte";
    import { onConnectedAgentCount } from "../../data/flux/connected-agents.service.fn";
    import type { FluxAgentNetworkConnection } from "@flux/shared/connection";

    // Passed by Astro
    export let fluxAgentNetworkConnection: FluxAgentNetworkConnection;
    export let initial: TNetworkAgentCountAt;

    // Export the store directly
    export const connectedAgents = writable<TNetworkAgentCountAt>(initial);

    onMount(async () => {
        // Update on new data
        (await onConnectedAgentCount(fluxAgentNetworkConnection))(
            connectedAgents.set,
        );
    });
</script>

{#if $connectedAgents}
    <strong title={$connectedAgents.date.toDateString()}>
        {$connectedAgents.count}
    </strong>
{/if}

<style>
    strong {
        text-align: right;
        display: block;
    }
</style>
