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
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatDateTime} from "$lib/i18n";

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
        if (s.length === 0) return "required";
        const n = Number(s);
        if (isNaN(n)) return "invalidNumber";
        if (n < 0) return "mustBePositive";
        return "valid";
    }

    let value: string = "";

    $: valid = isValid(value) === "valid";

    function validationMessage(s: string): string {
        const code = isValid(s);
        if (code === "valid") return "";
        return $_(`errors.${code}`, {locale: $lang});
    }

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
                    toast.success($_("admin.costs.costUpdated", {locale: $lang}));
                    invalidateAll();
                },
            })

    }

</script>

<Page notFoundMessage={$_("admin.costs.notFound", {locale: $lang})}>
    <div class="flex flex-col">
        <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">

            {#await costs}
                <Loader/>
            {:then cs}
                <div class="flex flex-wrap justify-between gap-4">
                    <div class="text-2xl">{$_("admin.costs.currentPrice", {locale: $lang, values: {price: formatMoney(cs[0].cost, $lang)}})}</div>
                    <div class="grid w-full max-w-sm items-center gap-1.5">
                        <Input inputmode="numeric" placeholder={$_("admin.costs.newCostPlaceholder", {locale: $lang})} bind:value/>
                        <p class="text-sm text-destructive {valid ? 'opacity-0' : 'opacity-100'}">{validationMessage(value)}</p>
                    </div>
                    <Button class="w-full max-w-sm" on:click={updateCost}>{$_("admin.costs.updateCost", {locale: $lang})}</Button>
                </div>

                <div class="flex flex-col gap-4 my-4">
                    {#each cs as c}
                        <Card.Root>
                            <Card.Header>
                                <Card.Title>{formatMoney(c.cost, $lang)}</Card.Title>
                                <div class="flex justify-between py-2">
                                    <Card.Description>{formatDateTime(c.createdAt, $lang)}</Card.Description>
                                </div>
                            </Card.Header>
                        </Card.Root>
                    {/each}
                </div>
            {/await}
        </div>
    </div>
</Page>
