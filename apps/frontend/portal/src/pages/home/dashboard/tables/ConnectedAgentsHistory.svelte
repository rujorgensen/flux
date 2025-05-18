<script lang="ts">
    // Passed by Astro
    export let networkId: string;

    import { writable } from 'svelte/store';
    import type { TNetworkAgent } from '@flux/mesh/store/redis/network-agent';
    import { app } from '../../../../data/api';
    import { createPagination, melt } from '@melt-ui/svelte';

    const dataStore = writable<TNetworkAgent[] | undefined>();

    const fetchData = async () => {
        const { data: initialValue } = await app.api
            .networks({
                networkId,
            })
            ['current-agents'].get();

        dataStore.set(initialValue);
    };

    setInterval(() => {
        fetchData().then().catch();
    }, 3000);

    const {
        elements: { root, pageTrigger, prevButton, nextButton },
        states: { pages, range },
    } = createPagination({
        count: 100,
        perPage: 10,
        defaultPage: 1,
        siblingCount: 1,
    });

    export const connectedAuthorities = dataStore;
</script>

{#if $connectedAuthorities}
    <table>
        <thead>
            <tr>
                <th>Id</th>
                <th>IP</th>
                <th>Data Usage</th>
                <th>Packets</th>
            </tr>
        </thead>
        <tbody>
            {#each $connectedAuthorities as row}
                <tr>
                    <td>{row.id}</td>
                    <td>{row.ip}</td>
                    <td style="text-align: right;">{row.bytes} kb</td>
                    <td>{row.packets}</td>
                </tr>
            {/each}
        </tbody>
    </table>

    <nav use:melt={$root}>
        <p>Showing items {$range.start} - {$range.end}</p>
        <div>
            <button use:melt={$prevButton}>Prev</button>
            {#each $pages as page (page.key)}
                {#if page.type === 'ellipsis'}
                    <span>...</span>
                {:else}
                    <button use:melt={$pageTrigger(page)}>{page.value}</button>
                {/if}
            {/each}
            <button use:melt={$nextButton}>Next</button>
        </div>
    </nav>
{/if}
