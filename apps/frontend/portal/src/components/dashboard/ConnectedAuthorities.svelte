<!-- ConnectedAuthorities.svelte -->
<script lang="ts">
    import { writable } from "svelte/store";
    import type { FluxAgentNetworkConnection } from "../../../../../../libs/flux/shared/connection/src";
    import { onMount } from "svelte";
    import type {
        TNetworkAuthorityCountAt,
        TNetworkId_S,
    } from "@flux/shared/types";
    import { getFluxNetworkConnection } from "../../data/flux-connection.fn";
    import { onConnectedAuthoritiesCount } from "../../data/flux/connected-authorities.service.fn";

    // Passed by Astro
    export let initial: TNetworkAuthorityCountAt;
    export let networkId: TNetworkId_S;
    export let networkCode: string;

    // Export the store directly
    export const connectedAuthorities =
        writable<TNetworkAuthorityCountAt>(initial);

    onMount(async () => {
        try {
            const fluxAgentNetworkConnection: FluxAgentNetworkConnection =
                await getFluxNetworkConnection(
                    networkId,
                    networkCode,
                    "portal-agent",
                );

            // Update on new data
            (await onConnectedAuthoritiesCount(fluxAgentNetworkConnection))(
                connectedAuthorities.set,
            );
        } catch (error) {
            console.error("Error connecting agent to network:", error);
        }
    });
</script>

{#if $connectedAuthorities}
    <strong title={$connectedAuthorities.date.toDateString()}>
        {$connectedAuthorities.count}
    </strong>
{/if}

<style>
    strong {
        text-align: right;
        display: block;
    }
</style>
