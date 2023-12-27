<script lang="ts">
    import type {ProblemDetails} from "../../../errors/problem_details";
    import Error from "$lib/components/complex/error.svelte";
    import Loader from "$lib/components/complex/loader.svelte";
    import NotFound from "$lib/components/complex/not-found.svelte";

    export let notFoundMessage: string;
    export let queue = 0;
    export let problem: ProblemDetails | null = null;
    export let empty: boolean = false;


</script>

{#if problem != null}
    <Error prob={problem}/>
{:else if queue !== 0}
    <Loader/>
{:else if empty}
    <NotFound message={notFoundMessage}/>
{:else}
    <slot/>
{/if}
