<!-- ConnectedAuthorities.svelte -->
<script lang="ts">
    import { dataUsage } from "../../business-logic/data-usage.fn";
</script>

{#if $dataUsage}
    <strong>{JSON.stringify($dataUsage)}</strong>
{/if}
