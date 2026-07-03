<script lang="ts">
    import {animations} from "$lib/design";
    import type {ProblemDetails} from "../../../errors/problem_details";
    import {AlertOctagon} from 'lucide-svelte';
    import Lottie from "$lib/components/complex/lottie.svelte";
    import * as Accordion from "$lib/components/ui/accordion";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";

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
                return $_('errorState.alienInvasion', {locale: $lang})
            case 401:
                return $_('errorState.doggyCantSwim', {locale: $lang})
            case 403:
                return $_('errorState.lostInSpace', {locale: $lang})
            case 404:
                return $_('errorState.chemicalExplosion', {locale: $lang})
            case 405:
                return $_('errorState.coffeeSpilt', {locale: $lang})
            case 406:
                return $_('errorState.doggyCantSmell', {locale: $lang})
            case 409:
                return $_('errorState.dogEatsNewsPaper', {locale: $lang})
            case 415:
                return $_('errorState.doggyCantSwim', {locale: $lang})
            case 422:
                return $_('errorState.icecreamMelted', {locale: $lang})
            case 500:
                return $_('errorState.laptopBroken', {locale: $lang})
            case 502:
                return $_('errorState.lochnessMonster', {locale: $lang})
            case 503:
                return $_('errorState.missingPiece', {locale: $lang})
            case 504:
                return $_('errorState.noTissue', {locale: $lang})
            default:
                return $_('errorState.doggyCantSwim', {locale: $lang})
        }
    })()

</script>
<div class="w-full flex justify-center items-center">
    <div class="max-w-[480px] w-11/12 flex-col justify-center items-center text-center bg-background p-8 rounded-lg">

        <h1 class="text-4xl text-primary py-6">{errorMessage}</h1>
        <div class="loading-container">
            <Lottie autoplay={true} loop={true} speed={1} lottieJson={animation}/>
        </div>
        <p class="text-2xl text-foreground">{prob.title}</p>
        <p class="text-xl px-4 text-muted-foreground">{prob.detail}</p>
        <div class="mx-auto mt-8 w-[90%] max-w-[640px] variant-filled-error">
            <Accordion.Root>
                <Accordion.Item value="item-1">
                    <Accordion.Trigger class="px-6 py-2 bg-red-400">
                        <AlertOctagon class="h-4 w-4"/>
                        {$_('errorState.errorDetails', {locale: $lang})}
                    </Accordion.Trigger>
                    <Accordion.Content>
                        <div class="p-4 bg-muted overflow-auto">
                            <code class="text-start text-foreground relative px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                <pre>{JSON.stringify(prob, null, 2)}</pre>
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
