<script>
    import {animations} from "$lib/design";
    import Lottie from "$lib/components/complex/lottie.svelte";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";
    /** @type {string | undefined} */
    export let loadingText = undefined;

</script>

<style lang="postcss">
    .loading-container {
        max-width: 600px;
        max-height: 600px;
        width: 90%;
    }
</style>
<div class="w-full flex justify-center items-center">
    <div class="max-w-[480px] w-[90%] flex-col justify-center items-center text-center">

    <div class="loading-container">
    <Lottie autoplay={true} loop={true} speed={3.5} lottieJson={animations.corgi}/>
</div>
<h3 class="text-foreground">{loadingText ?? $_('loader.default', {locale: $lang})}</h3>
</div>
</div>
