<script lang="ts">
    import "../app.pcss";
    import {signIn} from "@auth/sveltekit/client";
    import {page} from "$app/stores";
    import {onMount} from "svelte";
    import {LightSwitch} from "$lib/components/ui/light-switch";
    import {MainNav} from "../lib/components/custom/main-nav";
    import {setInitialClassState} from "$lib/components/ui/light-switch/light-switch";
    import {Account} from "../lib/components/custom/account";

    onMount(() => {
        if ($page.data.auth.signIn) signIn("descope");

    });
</script>
<svelte:head>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html `<\u{73}cript nonce="%sveltekit.nonce%">(${setInitialClassState.toString()})();</script>`}
</svelte:head>
<div class="relative flex min-h-screen flex-col" id="page">
    <div class="border-b border-b-muted">
        <div class="flex h-16 items-center justify-between px-4 w-11/12 max-w-[1200px] mx-auto">
            <a href="/" class="flex items-center space-x-2">
<!--                <img src="{cyanprint}" alt="CyanPrint" class="h-12 w-12">-->
                <span class="hidden text-foreground sm:inline-block font-bold">BunnyBooker</span>
            </a>
            <MainNav></MainNav>
            <div class="flex items-center space-x-4 lg:space-x-6">
                <LightSwitch></LightSwitch>
                <Account></Account>
            </div>
        </div>
    </div>
    <div class="flex-1">
        <slot></slot>
    </div>


</div>
