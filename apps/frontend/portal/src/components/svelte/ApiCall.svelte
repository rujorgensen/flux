<script>
    import { onMount } from "svelte";

    let data = null;
    let error = null;

    onMount(async () => {
        try {
            const response = await fetch('api/ping');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            // data = await response.json();
            data = await response.text();
        } catch (err) {
            error = err.message;
        }
    });
</script>

{#if error}
    <p class="error">{error}</p>
{:else if data}
    <pre>{JSON.stringify(data, null, 2)}</pre>
{:else}
    <p>Loading...</p>
{/if}

<style>
    .error {
        color: red;
    }
</style>
