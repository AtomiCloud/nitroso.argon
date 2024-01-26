<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    import type {CostPrincipalRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../errors/problem_details";
    import {Res} from "$lib/core/result";
    import {api, problem} from "../../store";
    import Loader from "$lib/components/complex/loader.svelte";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Table from "$lib/components/ui/table";

    //@ts-ignore
    import * as Select from "$lib/components/ui/select";

    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    import type {PageData} from "./$types";
    import {Input} from "$lib/components/ui/input";
    import {Button} from "$lib/components/ui/button";
    import {toResult} from "$lib/utility";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";

    export let data: PageData;


    $: costs = (Res.fromSerial<CostPrincipalRes[], ProblemDetails>(data.result)
        .match({
            ok: (a: CostPrincipalRes[]): CostPrincipalRes[] => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e);
                return null as never;
            }
        }) satisfies Promise<CostPrincipalRes[]>)


    function isValid(s: string): string {
        if (s.length === 0) return "Required";
        const n = Number(s);
        if (isNaN(n)) return "Invalid number";
        if (n < 0) return "Number must be positive";
        return "valid";
    }

    let value: string = "";

    $: valid = isValid(value) === "valid";

    async function updateCost() {
        await toResult(
            () => $api.vCostCreate("1", {cost: Number(value)}),
            "Cost failed to update")
            .match({
                err: (e) => {
                    console.error(e);
                    toast.error(e.detail ?? e.type);
                },
                ok: () => {
                    toast.success("Cost updated");
                    invalidateAll();
                },
            })

    }

</script>

<Page notFoundMessage="Withdrawals cannot be found">
    <div class="flex flex-col">
        <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">

            {#await costs}
                <Loader/>
            {:then cs}
                <div class="flex flex-wrap justify-between gap-4">
                    <div class="text-2xl">Current Price: ${cs[0].cost.toFixed(2)}</div>
                    <div class="grid w-full max-w-sm items-center gap-1.5">
                        <Input inputmode="numeric" placeholder="New Cost" bind:value/>
                        <p class="text-sm text-destructive {valid ? 'opacity-0' : 'opacity-100'}">{isValid(value)}</p>
                    </div>
                    <Button class="w-full max-w-sm" on:click={updateCost}>Update Cost</Button>
                </div>

                <div class="flex flex-col gap-4 my-4">
                    {#each cs as c}
                        <Card.Root>
                            <Card.Header>
                                <Card.Title>S${c.cost.toFixed(2)}</Card.Title>
                                <div class="flex justify-between py-2">
                                    <Card.Description>{new Date(c.createdAt).toLocaleString(undefined, {
                                        dateStyle: 'medium',
                                        timeStyle: 'medium'
                                    })}</Card.Description>
                                </div>
                            </Card.Header>
                        </Card.Root>
                    {/each}
                </div>
            {/await}
        </div>
    </div>
</Page>
