<script lang="ts">
    import {page} from "$app/stores";
    import Lottie from "$lib/components/complex/lottie.svelte";
    import {animations} from "$lib/design";
    import {Wallet2} from "lucide-svelte";
    import {Button} from "$lib/components/ui/button";
</script>

<div class="flex flex-col h-full items-center justify-between w-11/12 h-full max-w-[1200px] mx-auto my-4">
    <div class="text-4xl mt-12 md:mt-48">Success!</div>
    <div class="w-full max-w-[400px]">
        <Lottie autoplay={true} loop={false} speed={1} lottieJson={animations.success}/>

    </div>
    <div class="flex flex-col gap-2 items-center">
        <div class="text-xl text-center">Successfully deposited into BunnyBooker</div>

    </div>
    <div class="flex flex-col items-center gap-8 mb-24 md:mb-48">
        <div class="text-2xl font-light">
            Current Balance: S${($page.data.user?.wallet?.usable ?? 0).toFixed(2)}
        </div>
        <div class="flex gap-4 justify-center flex-wrap items-center">
            <Button class="w-full md:w-64" href="/wallets/{$page.data.user?.wallet?.id}">
                <Wallet2 class="mr-2 h-4 w-4"/>
                View Wallet
            </Button>
        </div>

    </div>


</div>
