<script lang="ts">
    // Passed by Astro
    export let networkId: string;

    import { writable } from "svelte/store";
    import { app } from "../../../../data/api";
    import { onMount } from "svelte";
    import { formatDate } from "apps/frontend/portal/src/utils/pipes/data-format.pipe";
    import type { TNetworkAgent } from "@flux/mesh/store/redis/network-agent";

    export const dataStore = writable<TNetworkAgent[] | undefined>();

    onMount(async () => {
        const fetchData = async () => {
            const { data } = await app.api
                .networks({
                    networkId,
                })
                .agents.connected.get();

            if (data) {
                dataStore.set(
                    data.map((a) => ({
                        ...a,
                        connectedAt: new Date(a.connectedAt),
                    })),
                );
            } else {
                console.error("Error fetching data");
            }
        };

        fetchData().then().catch();
    });

    export const connectedAgents = dataStore;
</script>

<table>
    <thead>
        <tr>
            <th>ID</th>
            <th>UID</th>
            <th>IP</th>
            <th>address</th>
            <th>bytes</th>
            <th>Connected At</th>
        </tr>
    </thead>
    <tbody>
        {#if $connectedAgents}
            {#each $connectedAgents as row}
                <tr>
                    <td>{row.id}</td>
                    <td>{row.uid}</td>
                    <td>{row.ip}</td>
                    <td>{row.address}</td>
                    <td>{row.bytes}</td>
                    <td>{formatDate(row.connectedAt)}</td>
                </tr>
            {/each}
        {/if}
    </tbody>
</table>
