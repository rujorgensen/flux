<script lang="ts" module>
    import AudioWaveformIcon from "@lucide/svelte/icons/audio-waveform";
    import BookOpenIcon from "@lucide/svelte/icons/book-open";
    import BotIcon from "@lucide/svelte/icons/bot";
    import ChartPieIcon from "@lucide/svelte/icons/chart-pie";
    import CommandIcon from "@lucide/svelte/icons/command";
    import FrameIcon from "@lucide/svelte/icons/frame";
    import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
    import MapIcon from "@lucide/svelte/icons/map";
    import Settings2Icon from "@lucide/svelte/icons/settings-2";

    // This is sample data.
    const data = {
        networks: [
            {
                name: "Acme Inc",
                logo: GalleryVerticalEndIcon,
                plan: "Enterprise",
                networkId: "acme-network-id" as TNetworkId_S,
            },
            {
                name: "Acme Corp.",
                logo: AudioWaveformIcon,
                plan: "Startup",
                networkId: "acme-2-network-id" as TNetworkId_S,
            },
            {
                name: "Evil Corp.",
                logo: CommandIcon,
                plan: "Free",
                networkId: "evil-corp-network-id" as TNetworkId_S,
            },
        ],
        navMain: [
            {
                title: "Dashboard",
                url: "#",
                icon: LayoutDashboardIcon,
                isActive: true,
                items: [
                    {
                        title: "Connected Authorities",
                        url: "/dashboard/connected-authorities",
                    },
                    {
                        title: "Connected Agents",
                        url: "/dashboard/connected-agents",
                    },
                    {
                        title: "Active Channels",
                        url: "/dashboard/active-channels",
                    },
                ],
            },
            {
                title: "Models",
                url: "#",
                icon: BotIcon,
                items: [
                    {
                        title: "Genesis",
                        url: "#",
                    },
                    {
                        title: "Explorer",
                        url: "#",
                    },
                    {
                        title: "Quantum",
                        url: "#",
                    },
                ],
            },
            {
                title: "Documentation",
                url: "#",
                icon: BookOpenIcon,
                items: [
                    {
                        title: "Introduction",
                        url: "#",
                    },
                    {
                        title: "Get Started",
                        url: "#",
                    },
                    {
                        title: "Tutorials",
                        url: "#",
                    },
                    {
                        title: "Changelog",
                        url: "#",
                    },
                ],
            },
            {
                title: "Settings",
                url: "#",
                icon: Settings2Icon,
                items: [
                    {
                        title: "General",
                        url: "#",
                    },
                    {
                        title: "Team",
                        url: "#",
                    },
                    {
                        title: "Billing",
                        url: "#",
                    },
                    {
                        title: "Limits",
                        url: "#",
                    },
                ],
            },
        ],
        projects: [
            {
                name: "Design Engineering",
                url: "#",
                icon: FrameIcon,
            },
            {
                name: "Sales & Marketing",
                url: "#",
                icon: ChartPieIcon,
            },
            {
                name: "Travel",
                url: "#",
                icon: MapIcon,
            },
        ],
    };
</script>

<script lang="ts">
    import NavMain from "./nav-main.svelte";
    import NavProjects from "./nav-projects.svelte";
    import NavUser from "./nav-user.svelte";
    import NetworkSwitcher from "./network-switcher.svelte";
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import type { ComponentProps } from "svelte";
    import { LayoutDashboardIcon } from "@lucide/svelte";
    import type { TNetworkId_S } from "@flux/shared/types";

    let {
        ref = $bindable(null),
        collapsible = "icon",
        ...restProps
    }: ComponentProps<typeof Sidebar.Root> = $props();

    let { userSession } = restProps;
</script>

<Sidebar.Root {collapsible} {...restProps}>
    <Sidebar.Header>
        <NetworkSwitcher networks={data.networks} />
    </Sidebar.Header>
    <Sidebar.Content>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
    </Sidebar.Content>
    <Sidebar.Footer>
        <NavUser user={userSession} />
    </Sidebar.Footer>
    <Sidebar.Rail />
</Sidebar.Root>
