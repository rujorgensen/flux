<!-- ConnectedAuthorities.svelte -->
<script lang="ts">
    import { connectedAgents } from "../../business-logic/connected-agents.fn";
</script>

{#if $connectedAgents}
    <strong>{JSON.stringify($connectedAgents)}</strong>
{/if}
