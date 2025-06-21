<script lang="ts">
    // * Types
    import type {
        TNetworkAgentCountAt,
        TNetworkAuthorityCountAt,
        TNetworkChannelCountAt,
        TNetworkId_S,
    } from "@flux/shared/types";

    // * Dashboard tiles
    import ConnectedAuthoritityCount from "$lib/components/dashboard/ConnectedAuthoritityCount.svelte";

    // * Data sources
    import ChartJs from "./ChartJS.svelte";
    import ConnectedAgentCount from "../dashboard/ConnectedAgentCount.svelte";
    import ActiveChannelCount from "../dashboard/ActiveChannelCount.svelte";
    import TotalDataUsage from "../dashboard/TotalDataUsage.svelte";

    let {
        networkId,
        networkCode,
        initialConnectedAuthoritiesCount,
        initialConnectedAgentsCount,
        initialChannelCount,
    }: {
        networkId: TNetworkId_S;
        networkCode: string;
        initialConnectedAuthoritiesCount: TNetworkAuthorityCountAt;
        initialConnectedAgentsCount: TNetworkAgentCountAt;
        initialChannelCount: TNetworkChannelCountAt;
    } = $props();
</script>

<div class="flex flex-1 flex-col gap-5 p-4 pt-0">
    <div class="grid auto-rows-min gap-5 md:grid-cols-4">
        <div class="panel bg-muted/50 rounded-xl">
            <h2>Connected Authorities</h2>
            <ConnectedAuthoritityCount
                {networkId}
                {networkCode}
                initial={initialConnectedAuthoritiesCount}
            />
        </div>
        <div class="panel bg-muted/50 rounded-xl">
            <h2>Connected Agents</h2>
            <ConnectedAgentCount
                {networkId}
                {networkCode}
                initial={initialConnectedAgentsCount}
            />
        </div>
        <div class="panel bg-muted/50 rounded-xl">
            <h2>Active Channels</h2>
            <ActiveChannelCount
                {networkId}
                {networkCode}
                initial={initialChannelCount}
            />
        </div>
        <div class="panel bg-muted/50 rounded-xl">
            <h2>Total Data Usage</h2>
            <TotalDataUsage />
        </div>
    </div>
    <div class="panel bg-muted/50 max-h-[50vh] flex-1 rounded-xl md:min-h-min">
        <h2>Agents</h2>
        <ChartJs />
    </div>
</div>

<style>
    .panel {
        border-radius: var(--roundness-medium);
        border: 1px solid var(--outline-1);
        background: var(--surface-1);
        box-shadow: var(--shadow-2);
        color: var(--text-1);
        display: grid;

        grid-template-rows: auto 1fr;
        gap: var(--size-2);
        padding: var(--padding-medium);
    }
</style>
