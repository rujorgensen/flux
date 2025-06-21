<!-- ActiveChannelCount.svelte -->
<script lang="ts">
    import { writable } from "svelte/store";
    import type {
        TNetworkChannelCountAt,
        TNetworkId_S,
    } from "@flux/shared/types";
    import { onMount } from "svelte";
    import type { FluxAgentNetworkConnection } from "@flux/shared/connection";
    import { onActiveChannelCount } from "../../data/flux/channels.service.fn";
    import { getFluxNetworkConnection } from "../../data/flux-connection.fn";

    // * Stores
    import { type Network, activeNetwork } from "$lib/stores/activeNetwork";

    // Passed by Astro
    export let initial: TNetworkChannelCountAt;
    export let networkId: TNetworkId_S;
    export let networkCode: string;

    const update = async (networkId: TNetworkId_S, networkCode: string) => {
        try {
            const fluxAgentNetworkConnection: FluxAgentNetworkConnection =
                await getFluxNetworkConnection(
                    networkId as TNetworkId_S,
                    networkCode,
                    "portal-agent",
                );

            // Update on new data
            (await onActiveChannelCount(fluxAgentNetworkConnection))(
                activeChannels.set,
            );
        } catch (error) {
            console.error("Error connecting agent to network:", error);
        }
    };

    // Export the store directly
    export const activeChannels = writable<TNetworkChannelCountAt>(initial);

    onMount(async () => {
        update(networkId, networkCode);
        activeNetwork.subscribe(async (network: Network | null) => {
            if (network === null) {
                return;
            }

            update(network.networkId, networkCode);
        });
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
