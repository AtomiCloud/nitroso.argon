<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";

    import {Res} from "$lib/core/result";
    import type {UserRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../../errors/problem_details";
    import {problem} from "../../../store";

    import Loader from "$lib/components/complex/loader.svelte";
    import Wallet from "$lib/components/entities/Wallet.svelte";
    import type {PageData} from "./$types";
    import {page} from "$app/stores";

    export let data: PageData;

    $: user = (Res.fromSerial<UserRes, ProblemDetails>(data.result)
        .match({
            ok: (a: UserRes): UserRes => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                problem.set(e);
                return null as never;
            }
        }) satisfies Promise<UserRes>)


</script>

<Page notFoundMessage="User cannot be found">
    <div class="border-b border-b-muted">
        <h2 class="py-10 text-3xl lg:text-4xl text-foreground max-w-[1200px] w-11/12 mx-auto">
            User
        </h2>
    </div>
    <div class="w-full min-h-[80vh] bg-muted dark:bg-background">
        <div class="flex flex-col w-11/12 max-w-[1200px] mx-auto py-8">
            {#await user}
                <Loader/>
            {:then u}
                <div class="flex flex-col gap-4">
                    <Wallet
                            user={u.principal}
                            wallet={u.wallet}
                            admin={$page.data.session?.roles?.includes("admin")}
                    />
                </div>
            {/await}
        </div>
    </div>

</Page>
