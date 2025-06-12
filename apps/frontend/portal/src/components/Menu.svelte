<script lang="ts">
    import { LayoutDashboard, CreditCard, Sun, Moon } from "@lucide/svelte";
    import { onMount } from "svelte";
    import Avatar from "./svelte/melt-ui/Avatar.svelte";

    let theme = "light";

    onMount(() => {
        theme = document.documentElement.getAttribute("data-theme") || "light";
        document.documentElement.setAttribute("data-theme", theme);
    });

    function toggleTheme() {
        theme = theme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", theme);
    }

    let current = "dashboard";

    // Passed by Astro
    export let userSession: any;
    console.log({ userSession });
</script>

<div class="sidebar">
    <div class="link-group">
        <img class="avatar" src={userSession.image} alt="Avatar" />
        <Avatar />

        <a
            class="icon-btn"
            class:active={current === "dashboard"}
            on:click={() => (current = "dashboard")}
            aria-label="Dashboard"
            href="/"
        >
            <LayoutDashboard size="20" />
        </a>

        <a
            class="icon-btn"
            class:active={current === "billing"}
            on:click={() => (current = "billing")}
            aria-label="Billing"
            href="/about"
        >
            <CreditCard size="20" />
        </a>
    </div>

    <button
        class="icon-btn bottom"
        on:click={toggleTheme}
        aria-label="Toggle theme"
    >
        {#if theme === "dark"}
            <Moon size="20" />
        {:else}
            <Sun size="20" />
        {/if}
    </button>
</div>

<style>
    .sidebar {
        block-size: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        background-color: var(--surface-1);

        padding: var(--padding-medium);
        border: 1px solid var(--outline-1);
        border-radius: 0 var(--roundness-medium) var(--roundness-medium) 0;
    }

    .avatar {
        inline-size: var(--size-8);
        block-size: var(--size-8);
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid var(--surface-3);
    }

    .icon-btn {
        inline-size: var(--size-7);
        block-size: var(--size-7);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-2);
        background: transparent;
        color: var(--text-1);
        transition: background 0.2s;
    }
</style>
