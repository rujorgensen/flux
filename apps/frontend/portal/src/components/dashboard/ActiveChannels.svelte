<!-- ConnectedAuthorities.svelte -->
<script lang="ts">
    import { activeChannels } from "../../business-logic/active-channels.fn";
</script>

{#if $activeChannels}
    <strong>{JSON.stringify($activeChannels)}</strong>
{/if}
