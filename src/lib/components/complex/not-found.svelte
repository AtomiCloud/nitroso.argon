<script lang="ts">
    import {animations} from "$lib/design";
    import Lottie from "$lib/components/complex/lottie.svelte";

    export let message: string;

</script>

<div class="w-full h-full flex justify-center items-center">
    <div class="max-w-[480px] max-h-full w-11/12 flex-col justify-center items-center text-center">
        <Lottie speed={1} loop={false} autoplay={true} lottieJson={animations.emptybox}/>
        <h4 class="text-foreground">{message}</h4>
    </div>
</div>
