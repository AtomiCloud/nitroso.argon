<script lang="ts">

    import {onMount} from "svelte";
    import type {LottiePlayer} from "lottie-web";

    export let lottieJson: unknown;
    export let loop: boolean;
    export let autoplay: boolean;

    export let speed: number;
    let container: HTMLElement;

    onMount(async () => {
        const Lottie = (await import("lottie-web")) as unknown as LottiePlayer;
        Lottie.loadAnimation({
            container: container,
            animationData: lottieJson,
            loop,
            autoplay,
        }).setSpeed(speed);

    });

</script>

<div class="lottie-container" bind:this={container}>

</div>

<style>
    .lottie-container {
        width: 100%;
        height: 100%;
    }
</style>
