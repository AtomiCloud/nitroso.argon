<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";


    //@ts-ignore
    import Icon from 'svelte-icons-pack/Icon.svelte';
    import {Res} from "$lib/core/result";
    import type {TransactionRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../../errors/problem_details";
    import {problem} from "../../../store";
    import Loader from "$lib/components/complex/loader.svelte";
    import TransactionComponent from "$lib/components/entities/Transaction.svelte";
    import type {PageData} from "./$types";

    export let data: PageData;

    $: transaction = (Res.fromSerial<TransactionRes, ProblemDetails>(data.result)
        .match({
            ok: (a: TransactionRes): TransactionRes => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e);
                return null as never;
            }
        }) satisfies Promise<TransactionRes>)
</script>

<Page notFoundMessage="Wallet cannot be found">
    <div class="border-b border-b-muted">
        <h2 class="py-10 text-3xl lg:text-4xl text-foreground max-w-[1200px] w-11/12 mx-auto">
            Transaction
        </h2>
    </div>
    <div class="w-full min-h-[80vh] bg-muted dark:bg-background">
        <div class="flex flex-col w-11/12 max-w-[1200px] mx-auto py-8">
            {#await transaction}
                <Loader/>
            {:then t}
                <div class="flex flex-col gap-4">
                    <TransactionComponent transaction={t} walletLink={undefined} userLink={undefined}/>
                </div>
            {/await}
        </div>
    </div>

</Page>
