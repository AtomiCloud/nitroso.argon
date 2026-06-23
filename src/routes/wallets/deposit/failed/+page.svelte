<script lang="ts">
    import Lottie from "$lib/components/complex/lottie.svelte";
    import {animations} from "$lib/design";
    import {CircleDollarSign} from "lucide-svelte";
    import {Button} from "$lib/components/ui/button";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";
</script>

<div class="flex flex-col h-full items-center justify-between w-11/12 h-full max-w-[1200px] mx-auto my-4">
    <div class="text-4xl mt-12 md:mt-48">{$_('wallets.deposit.failed.title', { locale: $lang })}</div>
    <div class="w-full max-w-[400px]">
        <Lottie autoplay={true} loop={false} speed={1} lottieJson={animations.dogSwimming}/>

    </div>

    <div class="text-xl text-center font-light my-12">{$_('wallets.deposit.failed.message', { locale: $lang })}</div>

    <div class="flex flex-col items-center gap-8 mb-24 md:mb-48">
        <div class="flex gap-4 justify-center flex-wrap items-center">
            <Button class="w-full md:w-64" href="/wallets/deposit">
                <CircleDollarSign class="h-4 w-4 mr-2"/>
                {$_('wallets.deposit.failed.tryAgain', { locale: $lang })}
            </Button>
        </div>

    </div>


</div>
