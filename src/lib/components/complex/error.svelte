<script lang="ts">
    import {animations} from "$lib/design";
    import type {ProblemDetails} from "../../../errors/problem_details";
    import {AlertOctagon} from 'lucide-svelte';
    import Lottie from "$lib/components/complex/lottie.svelte";
    import * as Accordion from "$lib/components/ui/accordion";

    export let prob: ProblemDetails;

    $: animation = (() => {
        switch (prob.status) {
            case 400:
                return animations.cow
            case 401:
                return animations.dogSwimming
            case 403:
                return animations.astronaut
            case 404:
                return animations.chemical
            case 405:
                return animations.coffee
            case 406:
                return animations.dogSmell
            case 409:
                return animations.dogNewsPaper
            case 415:
                return animations.dogSwimming
            case 422:
                return animations.icecream
            case 500:
                return animations.laptop
            case 502:
                return animations.lochness
            case 503:
                return animations.puzzle
            case 504:
                return animations.tissue
            default:
                return animations.dogSwimming
        }
    })()

    $: errorMessage = (() => {

        switch (prob.status) {
            case 400:
                return "Error - Alien Invasion"
            case 401:
                return "Error - Doggy Can't Swim"
            case 403:
                return "Error - Lost in Space"
            case 404:
                return "Error - Chemical Explosion"
            case 405:
                return "Error - Coffee Spilt"
            case 406:
                return "Error - Doggy Can't Smell"
            case 409:
                return "Error - Dog Eats News Paper"
            case 415:
                return "Error - Doggy Can't Swim"
            case 422:
                return "Error - Icecream Melted"
            case 500:
                return "Error - Laptop Broken"
            case 502:
                return "Error - Lochness Monster Exist?"
            case 503:
                return "Error - Missing Piece"
            case 504:
                return "Error - No Tissue"
            default:
                return "Error - Doggy Can't Swim"
        }
    })()

</script>
<div class="w-full h-full flex justify-center items-center">
    <div class="max-w-[480px] max-h-full w-11/12 flex-col justify-center items-center text-center bg-background p-8 rounded-lg">

        <h1 class="text-4xl text-primary py-6">{errorMessage}</h1>
        <div class="loading-container">
            <Lottie autoplay={true} loop={true} speed={1} lottieJson={animation}/>
        </div>
        <p class="text-2xl text-foreground">{prob.title}</p>
        <p class="text-xl px-4 text-muted-foreground">{prob.detail}</p>
        <div class="mx-auto mt-8 w-[90%] max-w-[640px] variant-filled-error">
            <Accordion.Root>
                <Accordion.Item value="item-1">
                    <Accordion.Trigger class="text-muted-foreground">
                        <AlertOctagon class="h-4 w-4 text-muted-foreground"/>
                        Error Details
                    </Accordion.Trigger>
                    <Accordion.Content>
                        <div class="m-4">
                            <code class="text-start text-foreground relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                        <pre>
                            {JSON.stringify(prob, null, 2)}
                        </pre>
                            </code>
                        </div>
                    </Accordion.Content>
                </Accordion.Item>
            </Accordion.Root>
        </div>
    </div>
</div>
<style lang="postcss">
    .loading-container {
        max-width: 600px;
        max-height: 600px;
        width: 90%;
    }
</style>
