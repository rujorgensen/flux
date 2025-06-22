<script lang="ts">
    // Passed by Astro
    export let networkId: string;

    import { writable } from "svelte/store";
    import { app } from "../../../data/api";
    import type { INetworkChannel } from "@flux/shared/types";
    import { onMount } from "svelte";
    import { formatDate } from "apps/frontend/portal/src/utils/pipes/data-format.pipe";

    export const dataStore = writable<INetworkChannel[] | undefined>();

    onMount(async () => {
        const fetchData = async () => {
            const { data } = await app.api
                .networks({
                    networkId,
                })
                .channels.get();

            if (data) {
                dataStore.set(
                    data.map((a) => ({
                        ...a,
                        createdAt: new Date(a.createdAt),
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
            <th>Channel Name</th>
            <th>member distribution</th>
            <th>Member Count</th>
            <th>Data Usage [bytes]</th>
            <th>Created At</th>
        </tr>
    </thead>
    <tbody>
        {#if $activeChannels}
            {#each $activeChannels as row}
                <tr>
                    <td>{row.channelName}</td>
                    <td>{row.memberDistribution}</td>
                    <td style="text-align: right;">{row.members}</td>
                    <td style="text-align: right;">{row.bytes}</td>
                    <td>{formatDate(row.createdAt)}</td>
                </tr>
            {/each}
        {/if}
    </tbody>
</table>
