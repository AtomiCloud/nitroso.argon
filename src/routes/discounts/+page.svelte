<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    import type {DiscountPrincipalRes, DiscountRecordRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../errors/problem_details";
    import {Res} from "$lib/core/result";
    import {api, problem} from "../../store";
    import Loader from "$lib/components/complex/loader.svelte";
    import {page} from "$app/stores";
    import {goto, invalidateAll} from "$app/navigation";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";

    //@ts-ignore
    import * as Select from "$lib/components/ui/select";
    import type {Selected} from "bits-ui";
    import {FilePieChart, LucideTicket, Puzzle} from "lucide-svelte";
    import type {PageData} from "./$types";
    import {DISCOUNT_MATCH_MODE, DISCOUNT_STATUS, DISCOUNT_TYPE} from "./status";
    import {Input} from "$lib/components/ui/input";
    import {Badge} from "$lib/components/ui/badge";
    import CreateDiscounts from "$lib/components/entities/Discount/CreateDiscounts.svelte";
    import {Switch} from "$lib/components/ui/switch";
    import {toResult} from "$lib/utility";
    import {toast} from "svelte-sonner";
    import UpdateDiscounts from "$lib/components/entities/Discount/UpdateDiscounts.svelte";
    import DeleteDiscounts from "$lib/components/entities/Discount/DeleteDiscounts.svelte";

    export let data: PageData;

    $: discounts = (Res.fromSerial<DiscountPrincipalRes[], ProblemDetails>(data.result)
        .match({
            ok: (a: DiscountPrincipalRes[]): DiscountPrincipalRes[] => {
                problem.set(null)
                return a.reverse();
            },
            err: (e) => {
                console.error(e);
                problem.set(e);
                return null as never;
            }
        }) as Promise<DiscountPrincipalRes[]>);


    let search = $page.url.searchParams.get("search") ?? "";
    let discountType = $page.url.searchParams.get("discountType") ?? "";
    let matchMode = $page.url.searchParams.get("matchMode") ?? "";
    let disabled = $page.url.searchParams.get("disabled") ?? "";

    let discountTypeSelect: Selected<string> | undefined = DISCOUNT_TYPE[discountType];
    let matchModeSelect: Selected<string> | undefined = DISCOUNT_MATCH_MODE[matchMode];
    let disabledSelect: Selected<string> | undefined = DISCOUNT_STATUS[disabled];

    function discountTypeChange(s: Selected<string> | undefined) {
        discountTypeSelect = s;
        triggerSearch();
    }

    function matchModeChange(s: Selected<string> | undefined) {
        matchModeSelect = s;
        triggerSearch();
    }

    function disableChange(s: Selected<string> | undefined) {
        disabledSelect = s;
        triggerSearch();
    }


    function triggerSearch() {
        const mm = matchModeSelect?.value ?? ""
        const dt = discountTypeSelect?.value ?? ""
        const ds = disabledSelect?.value ?? ""
        goto(`?discountType=${dt}&matchMode=${mm}&disabled=${ds}&search=${search}`,
            {
                keepFocus: true,
                noScroll: true,
            });
    }

    function displayDiscount(record: DiscountRecordRes): string {
        if (record.type === "Percentage") {
            return `${(record.amount * 100).toFixed(1)}%`
        }
        return `S$ ${record.amount.toFixed(2)}`
    }

    const loadingTracker: Record<string, boolean> = {}

    const onChange = (current: DiscountPrincipalRes) => async (e: boolean) => {

        loadingTracker[current!.id] = true;

        await toResult(() => $api.vDiscountUpdate(current.id, "1.0", {
            record: {
                ...current.record
            },
            target: {
                ...current.target
            },
            status: {
                ...current.status,
                disabled: !e
            }
        }), "Failed to update discount").match({
            ok: ok => {
                toast.info(`Successfully ${ok.status.disabled ? 'disabled' : 'enabled'} discount`);
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        })
        loadingTracker[current.id] = false;
    }

</script>

<div class="flex flex-col">
    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">
        <div class="flex flex-wrap gap-4 w-full">
            <Input placeholder="Search" bind:value={search} on:input={triggerSearch}/>
            <Select.Root bind:selected={disabledSelect} onSelectedChange={disableChange}>
                <Select.Trigger class="w-full lg:max-w-60">
                    <FilePieChart class="mr-2 h-4 w-4"/>
                    <Select.Value placeholder="Status"/>
                </Select.Trigger>
                <Select.Content>
                    <Select.Item value="">None</Select.Item>
                    {#each Object.entries(DISCOUNT_STATUS) as [, val]}
                        <Select.Item value={val.value}>{val.label}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
            <Select.Root bind:selected={discountTypeSelect} onSelectedChange={discountTypeChange}>
                <Select.Trigger class="w-full lg:max-w-60">
                    <LucideTicket  class="mr-2 h-4 w-4"/>
                    <Select.Value placeholder="Discount Type"/>
                </Select.Trigger>
                <Select.Content>
                    <Select.Item value="">None</Select.Item>
                    {#each Object.entries(DISCOUNT_TYPE) as [, val]}
                        <Select.Item value={val.value}>{val.label}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>

            <Select.Root bind:selected={matchModeSelect} onSelectedChange={matchModeChange}>
                <Select.Trigger class="w-full lg:max-w-60">
                    <Puzzle class="mr-2 h-4 w-4"/>
                    <Select.Value placeholder="Match Mode"/>
                </Select.Trigger>
                <Select.Content>
                    <Select.Item value="">None</Select.Item>
                    {#each Object.entries(DISCOUNT_MATCH_MODE) as [, val]}
                        <Select.Item value={val.value}>{val.label}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
            <CreateDiscounts/>
        </div>
        {#await discounts}
            <Loader/>
        {:then ds}
            <Page notFoundMessage="Discounts cannot be found" empty={ds.length === 0}>
                <div class="flex flex-col gap-4 my-4">
                    {#each ds as d}
                        <Card.Root>
                            <Card.Header class="bg-muted">
                                <div class="flex justify-between">
                                    <div>
                                        <Card.Title>{d.record.name}</Card.Title>
                                        <Card.Description>{d.record.description}</Card.Description>
                                    </div>
                                    <div class="flex items-center">
                                        <Badge>{d.record?.type}</Badge>
                                    </div>
                                </div>
                            </Card.Header>
                            <Card.Content>
                                <div class="flex gap-8 justify-between">
                                    <div>
                                        <div class="text-lg my-4">
                                            Provides {displayDiscount(d.record)} discount for
                                        </div>

                                        <div class="flex gap-4 items-center flex-wrap">
                                            {#each d.target.matches as m, i }
                                                <div class="flex gap-2 my-2 items-center border p-2 rounded-lg">
                                                    {m.matchType}
                                                    <Badge>{m.value}</Badge>
                                                </div>
                                                <div>
                                                    {#if i !== d.target.matches.length - 1}
                                                        {d.target.matchMode === "All" ? 'AND' : 'OR'}
                                                    {/if}
                                                </div>
                                            {/each}
                                        </div>
                                    </div>
                                    <div class="flex flex-col justify-center gap-4">
                                        <div class="flex justify-center flex-col items-center">
                                            <Switch disabled={loadingTracker[d.id]} checked={!d.status.disabled}
                                                    onCheckedChange={onChange(d)}/>
                                        </div>
                                        <div>
                                            <UpdateDiscounts discount={d}/>
                                            <DeleteDiscounts discount={d}/>
                                        </div>
                                    </div>
                                </div>
                            </Card.Content>
                        </Card.Root>
                    {/each}
                </div>
            </Page>
        {/await}

    </div>
</div>
