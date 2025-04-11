<!-- ConnectedAuthorities.svelte -->
<script lang="ts">
    import { connectedAuthorities } from "../../business-logic/connected-authorities.fn";
</script>

{#if $connectedAuthorities}
    <strong>{JSON.stringify($connectedAuthorities)}</strong>
{/if}
