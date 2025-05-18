<script lang="ts">
    // Passed by Astro
    export let networkId: string;

    import { writable } from 'svelte/store';
    import { app } from '../../../../data/api';

    const dataStore = writable<TNetworkAgent[] | undefined>();

    const fetchData = async () => {
        const { data } = await app.api
            .networks({
                networkId,
            })
            ['current-agents'].get();

        console.log('Connected Authorities', data.length);

        dataStore.set(data);
    };

    fetchData().then().catch();

    export const connectedAuthorities = dataStore;
</script>

{#if $connectedAuthorities}
    <strong>{JSON.stringify($connectedAuthorities)}</strong>
{/if}

memberData

<table>
    <thead>
        <tr>
            <th>Authority</th>
            <th>Agent</th>
            <th>Channel</th>
            <th>Data Usage</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Authority 1</td>
            <td>Agent 1</td>
            <td>Channel 1</td>
            <td>100 MB</td>
        </tr>
        <tr>
            <td>Authority 2</td>
            <td>Agent 2</td>
            <td>Channel 2</td>
            <td>200 MB</td>
        </tr>
        <tr>
            <td>Authority 3</td>
            <td>Agent 3</td>
            <td>Channel 3</td>
            <td>300 MB</td>
        </tr>
        <tr>
            <td>Authority 4</td>
            <td>Agent 4</td>
            <td>Channel 4</td>
            <td>400 MB</td>
        </tr>
    </tbody>
</table>
