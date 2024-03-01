<script lang="ts">
    import Lottie from "$lib/components/complex/lottie.svelte";
    import {animations} from "$lib/design";
    import {Wallet2} from "lucide-svelte";
    import {Button} from "$lib/components/ui/button";
    import {page} from "$app/stores";
</script>

<div class="flex flex-col h-full items-center justify-between w-11/12 h-full max-w-[1200px] mx-auto my-4">
    <div class="text-4xl mt-12 md:mt-48 text-center">Deposit Cancelled</div>
    <div class="w-full max-w-[400px] my-16">
        <Lottie autoplay={true} loop={false} speed={1.5} lottieJson={animations.cancel}/>

    </div>
    <div class="text-xl text-center font-light my-6">Deposit to BunnyBooker has been cancelled.</div>
    <div class="flex flex-col items-center gap-8 mb-24 md:mb-48">
        <div class="flex gap-4 justify-center flex-wrap items-center">
            <Button class="w-full md:w-64" href="/wallets/{$page.data.user?.wallet?.id}">
                <Wallet2 class="mr-2 h-4 w-4"/>
                View Wallet
            </Button>
        </div>

    </div>


</div>
