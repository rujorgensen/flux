<script lang="ts">
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import { useSidebar } from "$lib/components/ui/sidebar/index.js";
    import {
        BadgeCheckIcon,
        BellIcon,
        LogOutIcon,
        SunIcon,
        MoonIcon,
        ChevronsUpDownIcon,
        SparklesIcon,
        CreditCardIcon,
    } from "@lucide/svelte";
    import { toggleMode, ModeWatcher, mode } from "mode-watcher";

    let {
        user,
    }: { user: { name: string; email: string; image?: string | null } } =
        $props();

    const sidebar = useSidebar();
</script>

<ModeWatcher />
<Sidebar.Menu>
    <Sidebar.MenuItem>
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                {#snippet child({ props })}
                    <Sidebar.MenuButton
                        size="lg"
                        class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        {...props}
                    >
                        <Avatar.Root class="size-8 rounded-lg">
                            <Avatar.Image src={user.image} alt={user.name} />
                            <Avatar.Fallback class="rounded-lg">
                                {user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                            </Avatar.Fallback>
                        </Avatar.Root>
                        <div
                            class="grid flex-1 text-left text-sm leading-tight"
                        >
                            <span class="truncate font-medium">{user.name}</span
                            >
                            <span class="truncate text-xs">{user.email}</span>
                        </div>
                        <ChevronsUpDownIcon class="ml-auto size-4" />
                    </Sidebar.MenuButton>
                {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
                class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
                side={sidebar.isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
            >
                <DropdownMenu.Label class="p-0 font-normal">
                    <div
                        class="flex items-center gap-2 px-1 py-1.5 text-left text-sm"
                    >
                        <Avatar.Root class="size-8 rounded-lg">
                            <Avatar.Image src={user.image} alt={user.name} />
                            <Avatar.Fallback class="rounded-lg"
                                >CN</Avatar.Fallback
                            >
                        </Avatar.Root>
                        <div
                            class="grid flex-1 text-left text-sm leading-tight"
                        >
                            <span class="truncate font-medium">{user.name}</span
                            >
                            <span class="truncate text-xs">{user.email}</span>
                        </div>
                    </div>
                </DropdownMenu.Label>
                <DropdownMenu.Separator />
                <DropdownMenu.Group>
                    <DropdownMenu.Item
                        onclick={toggleMode}
                        aria-label="Toggle theme"
                    >
                        {#if mode.current === "dark"}
                            <SunIcon />
                            Switch to light mode
                        {:else}
                            <MoonIcon />
                            Switch to dark mode
                        {/if}

                        <!-- <SunIcon
                            class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                        />
                        <MoonIcon
                            class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                        /> -->
                    </DropdownMenu.Item>
                </DropdownMenu.Group>
                <DropdownMenu.Separator />
                <DropdownMenu.Group>
                    <DropdownMenu.Item>
                        <SparklesIcon />
                        Upgrade to Pro
                    </DropdownMenu.Item>
                </DropdownMenu.Group>
                <DropdownMenu.Separator />
                <DropdownMenu.Group>
                    <DropdownMenu.Item>
                        <BadgeCheckIcon />
                        Account
                    </DropdownMenu.Item>
                    <DropdownMenu.Item>
                        <CreditCardIcon />
                        Billing
                    </DropdownMenu.Item>
                    <DropdownMenu.Item>
                        <BellIcon />
                        Notifications
                    </DropdownMenu.Item>
                </DropdownMenu.Group>
                <DropdownMenu.Separator />
                <DropdownMenu.Item>
                    <a href="/sign-in" class="flex items-center gap-2">
                        <LogOutIcon />
                        Log out
                    </a>
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    </Sidebar.MenuItem>
</Sidebar.Menu>
