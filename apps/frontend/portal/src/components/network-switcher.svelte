<script lang="ts">
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import { useSidebar } from "$lib/components/ui/sidebar/index.js";
    import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
    import PlusIcon from "@lucide/svelte/icons/plus";
    import { type Network, activeNetwork } from "$lib/stores/activeNetwork";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { createNetwork } from "$lib/data/api/networks.service.fn";

    let { networks }: { networks: Network[] } = $props();
    const sidebar = useSidebar();

    // Default value for the input field
    let createNetworkAlias: string = $state("Network Name");
    activeNetwork.set(networks[0] ?? null); // or however you get the default
    // import { onMount } from "svelte";
    // onMount(() => {
    // });
    import { writable } from "svelte/store";

    export const open = writable<boolean>(false);

    const createNetworkAndCloseModal = async (networkAlias: string) => {
        await createNetwork(networkAlias);
        open.set(false);
    };
</script>

{#if $activeNetwork}
    <Sidebar.Menu>
        <Sidebar.MenuItem>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    {#snippet child({ props })}
                        <Sidebar.MenuButton
                            {...props}
                            size="lg"
                            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div
                                class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
                            >
                                {#if $activeNetwork}
                                    <svelte:component
                                        this={$activeNetwork.logo}
                                        class="size-4"
                                    />
                                {/if}
                            </div>
                            <div
                                class="grid flex-1 text-left text-sm leading-tight"
                            >
                                <span class="truncate font-medium">
                                    {$activeNetwork.name}
                                </span>
                                <span class="truncate text-xs"
                                    >{$activeNetwork.plan}</span
                                >
                            </div>
                            <ChevronsUpDownIcon class="ml-auto" />
                        </Sidebar.MenuButton>
                    {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content
                    class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
                    align="start"
                    side={sidebar.isMobile ? "bottom" : "right"}
                    sideOffset={4}
                >
                    <DropdownMenu.Label class="text-muted-foreground text-xs"
                        >Networks</DropdownMenu.Label
                    >
                    {#each networks as network, index (network.name)}
                        <DropdownMenu.Item
                            onSelect={() => activeNetwork.set(network)}
                            class="gap-2 p-2"
                        >
                            <div
                                class="flex size-6 items-center justify-center rounded-md border"
                            >
                                <network.logo class="size-3.5 shrink-0" />
                            </div>
                            {network.name}
                            <DropdownMenu.Shortcut
                                >⌘{index + 1}</DropdownMenu.Shortcut
                            >
                        </DropdownMenu.Item>
                    {/each}
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item class="gap-2 p-2">
                        <div
                            class="flex size-6 items-center justify-center rounded-md border bg-transparent"
                        >
                            <PlusIcon class="size-4" />
                        </div>

                        <button
                            class="text-muted-foreground font-medium"
                            onclick={() => {
                                open.set(true);
                            }}
                        >
                            Add network
                        </button>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </Sidebar.MenuItem>
    </Sidebar.Menu>

    <Dialog.Root open={$open}>
        <!--
                                <Dialog.Trigger>
                                    <div class="text-muted-foreground font-medium">
                                        Add network
                                    </div>
                                </Dialog.Trigger>
                            -->
        <!-- Create new network modal -->
        <Dialog.Content class="sm:max-w-[425px]">
            <Dialog.Header>
                <Dialog.Title>Create Network</Dialog.Title>
                <Dialog.Description>
                    Create a new network here. Click save when you're done.
                </Dialog.Description>
            </Dialog.Header>
            <div class="grid gap-4 py-4">
                <div class="grid grid-cols-4 items-center gap-4">
                    <Label for="name" class="text-right">Network Name</Label>
                    <Input
                        id="name"
                        class="col-span-3"
                        placeholder="Network name"
                        bind:value={createNetworkAlias}
                    />
                </div>
                <!--
                    <div class="grid grid-cols-4 items-center gap-4">
                        <Label for="username" class="text-right">Username</Label>
                        <Input id="username" value="@peduarte" class="col-span-3" />
                    </div>
                -->
            </div>
            <Dialog.Footer>
                <Button
                    type="submit"
                    onclick={() =>
                        createNetworkAndCloseModal(createNetworkAlias)}
                >
                    Save changes
                </Button>
            </Dialog.Footer>
        </Dialog.Content>
    </Dialog.Root>
{/if}
