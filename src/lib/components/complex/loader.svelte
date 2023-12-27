<script>
    import {animations} from "$lib/design";
    import Lottie from "$lib/components/complex/lottie.svelte";
    export let loadingText = "Loading, please wait...";

</script>

<style lang="postcss">
    .loading-container {
        max-width: 600px;
        max-height: 600px;
        width: 90%;
    }
</style>
<div class="w-full h-full flex justify-center items-center">
    <div class="max-w-[480px] max-h-full w-[90%] flex-col justify-center items-center text-center">

    <div class="loading-container">
    <Lottie autoplay={true} loop={true} speed={3.5} lottieJson={animations.corgi}/>
</div>
<h3 class="text-foreground">{loadingText}</h3>
</div>
</div>
