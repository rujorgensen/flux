<script lang="ts">
    // * Data sources
    import ChartJs from "./ChartJS.svelte";
</script>

<div class="flex flex-1 flex-col gap-5 p-4 pt-0">
    <div class="panel bg-muted/50 max-h-[50vh] flex-1 rounded-xl md:min-h-min">
        <h2>Agents</h2>
        <ChartJs />
    </div>
</div>

<style>
    .panel {
        border-radius: var(--roundness-medium);
        border: 1px solid var(--outline-1);
        background: var(--surface-1);
        box-shadow: var(--shadow-2);
        color: var(--text-1);
        display: grid;

        grid-template-rows: auto 1fr;
        gap: var(--size-2);
        padding: var(--padding-medium);
    }
</style>
