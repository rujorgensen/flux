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
    import { getFluxNetworkConnection } from "../../data/flux-connection.fn";

    // Passed by Astro
    export let initial: TNetworkAgentCountAt;
    export let networkId: TNetworkId_S;
    export let networkCode: string;

    // Export the store directly
    export const connectedAgents = writable<TNetworkAgentCountAt>(initial);

    onMount(async () => {
        try {
            const fluxAgentNetworkConnection: FluxAgentNetworkConnection =
                await getFluxNetworkConnection(
                    networkId,
                    networkCode,
                    "portal-agent",
                );

            // Update on new data
            (await onConnectedAgentCount(fluxAgentNetworkConnection))(
                connectedAgents.set,
            );
        } catch (error) {
            console.error("Error connecting agent to network:", error);
        }
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
