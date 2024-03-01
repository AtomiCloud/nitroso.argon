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

    beforeNavigate(({from, to}) => {
        if (from.route.id !== to.route.id) loading.set(true);
    });

    afterNavigate(() => {
        problem.set(null);
        loading.set(false);
    });
    onMount(() => {
        if ($page.data.auth.signIn) {
            loading.set(true);
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
                <img src="{logo}" alt="CyanPrint" class="h-12 w-12">
                <span class="hidden text-foreground sm:inline-block font-bold">BunnyBooker</span>
            </a>


            <div class="flex items-center space-x-4 lg:space-x-6">
                {#if $page.data.session}
                    <Button href="/schedules">
                        Book Now
                    </Button>
                {/if}
                <LightSwitch/>
                <Account></Account>
            </div>
        </div>
    </div>


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

</div>
