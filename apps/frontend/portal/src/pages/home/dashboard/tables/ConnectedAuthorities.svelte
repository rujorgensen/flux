<script lang="ts">
    // Passed by Astro
    export let networkId: string;

    import { writable } from "svelte/store";
    import { app } from "../../../../data/api";
    import type { TNetworkAuthority } from "@flux/shared/types";
    import { onMount } from "svelte";
    import { formatDate } from "apps/frontend/portal/src/utils/pipes/data-format.pipe";

    export const dataStore = writable<TNetworkAuthority[] | undefined>();

    onMount(async () => {
        const fetchData = async () => {
            const { data } = await app.api
                .networks({
                    networkId,
                })
                .authorities.connected.get();

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

    export const activeChannels = dataStore;
</script>

<table>
    <thead>
        <tr>
            <th>ID</th>
            <th>Created At</th>
        </tr>
    </thead>
    <tbody>
        {#if $activeChannels}
            {#each $activeChannels as row}
                <tr>
                    <td>{row.id}</td>
                    <td>{formatDate(row.connectedAt)}</td>
                </tr>
            {/each}
        {/if}
    </tbody>
</table>
