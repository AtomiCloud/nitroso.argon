<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    //@ts-ignore
    import Icon from 'svelte-icons-pack/Icon.svelte';
    import {Res} from "$lib/core/result";
    import type {WithdrawalRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../../errors/problem_details";
    import {problem} from "../../../store";
    import Loader from "$lib/components/complex/loader.svelte";
    import Withdrawal from "$lib/components/entities/Withdrawal/Withdrawal.svelte";
    import {page} from "$app/stores";
    import type {PageData} from "./$types";

    export let data: PageData;

    $: withdrawal = (Res.fromSerial<WithdrawalRes, ProblemDetails>(data.result)
        .match({
            ok: (a: WithdrawalRes): WithdrawalRes => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                problem.set(e);
                return null as never;
            }
        }) satisfies Promise<WithdrawalRes>)
</script>

<Page notFoundMessage="Withdrawal cannot be found">
    <div class="border-b border-b-muted">
        <h2 class="py-10 text-3xl lg:text-4xl text-foreground max-w-[1200px] w-11/12 mx-auto">
            Withdrawal
        </h2>
    </div>
    <div class="w-full min-h-[80vh] bg-muted dark:bg-background">
        <div class="flex flex-col w-11/12 max-w-[1200px] mx-auto py-8">
            {#await withdrawal}
                <Loader/>
            {:then w}
                <div class="flex flex-col gap-4">
                    <Withdrawal withdrawal={w} admin={$page.data.session?.roles?.includes("admin") ?? false}/>
                </div>
            {/await}
        </div>
    </div>

</Page>
