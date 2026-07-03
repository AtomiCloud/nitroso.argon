<script lang="ts">
    import "../app.pcss";
    import {signIn} from "@auth/sveltekit/client";
    import {page} from "$app/stores";
    import {onMount} from "svelte";
    import {Account} from "../lib/components/custom/account";
    import logo from "$lib/assets/nitroso-logo-fs8.png"
    import {Footer} from "$lib/components/custom/footer";
    import Error from "$lib/components/complex/error.svelte";
    import {loading, problem, showContent, showLoading, showProblem} from "../store";
    import {afterNavigate, beforeNavigate} from "$app/navigation";
    import Loader from "$lib/components/complex/loader.svelte";
    import {Toaster} from "$lib/components/ui/sonner";
    import {ModeWatcher} from "mode-watcher";
    import LightSwitch from "$lib/components/complex/LightSwitch.svelte";
    import {Button} from "$lib/components/ui/button";
    import * as Avatar from "$lib/components/ui/avatar";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import mascot from "$lib/assets/nitroso-mascot-fs8.png";
    import LanguagePicker from "$lib/components/custom/LanguagePicker.svelte";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";
    beforeNavigate(({from, to}) => {
        if (from.route.id !== to.route.id) loading.set(true);
    });

    afterNavigate(() => {
        problem.set(null);
        loading.set(false);
    });
    onMount(() => {
        if ($page.data.auth.signIn) {
            signIn("descope");
        }
    });

</script>

<ModeWatcher defaultMode={"light"}/>
<Toaster/>

<div class="relative flex min-h-screen flex-col" id="page">
    <div class="border-b border-b-muted">
        <div class="flex h-16 items-center justify-between px-4 w-11/12 max-w-[1200px] mx-auto">
            <a href="/" class="flex items-center space-x-2">
                <div class="relative">
                    <Avatar.Root class="h-12 w-12 border-2 border-primary border-double">
                        <Avatar.Image src="{logo}" alt="BunnyBooker" class=""/>
                        <Avatar.Fallback>BB</Avatar.Fallback>
                    </Avatar.Root>
                </div>

<!--                <img src="{logo}" alt="CyanPrint" class="h-12 w-12">-->
                <span class="hidden text-foreground sm:inline-block font-bold">{$_('common.appName', { locale: $lang })}</span>
            </a>


            <div class="flex items-center space-x-4 lg:space-x-6">
                {#if $page.data.session}
                    <Button href="/schedules">
                        {$_('nav.bookNow', { locale: $lang })}
                    </Button>
                {/if}
                <LanguagePicker/>
                <LightSwitch/>
                <Account></Account>
            </div>
        </div>
    </div>

    {#if $page.data.auth.signIn}
        <div class="flex items-center justify-center h-full">
            <Loader loadingText={$_('loader.reauthenticating', { locale: $lang })}/>
        </div>
    {:else}
    <div class="flex-1 {$showContent ? '' : 'hidden'}">
        <slot/>
    </div>
    <div class="flex-1 {$showProblem ? '' : 'hidden'}">
        {#if $showProblem && $problem != null}
            <Error prob={$problem}/>
        {/if}
    </div>
    <div class="flex-1 {$showLoading ? '' : 'hidden'}">
        {#if $showLoading}
            <Loader/>
        {/if}
    </div>
    <div class="w-full bg-slate-800 text-white pb-12 pt-8">
        <Footer/>
    </div>
    {/if}
</div>
