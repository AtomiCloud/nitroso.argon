<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    import type {ProblemDetails} from "../../errors/problem_details";
    import {Res} from "$lib/core/result";
    import {problem} from "../../store";
    import Loader from "$lib/components/complex/loader.svelte";
    import {goto} from "$app/navigation";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    //@ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import {CalendarDate, DateFormatter, type DateValue, getLocalTimeZone, today} from "@internationalized/date";
    import type {PageData} from "./$types";
    import type {MaterializedCostRes} from "$lib/api/core/data-contracts";
    import {tick} from "svelte";
    import {Button} from "$lib/components/ui/button";
    import {page} from "$app/stores";
    import type {Timings} from "./typing";
    import {Badge} from "$lib/components/ui/badge";
    import {CalendarIcon, LucideInfo} from "lucide-svelte";
    import {cn} from "$lib/utils";
    import {Calendar} from "$lib/components/ui/calendar";

    export let data: PageData;

    // Util
    function toCalDate(s: string): DateValue | undefined {
        if (s == "") return today(getLocalTimeZone());
        const [d, m, y] = s.split("-");
        return new CalendarDate(parseInt(y), parseInt(m), parseInt(d));
    }

    function toZincDate(s?: DateValue): string {
        if (s == null) return "";
        const [y, m, d] = s.toString().split("-");
        return `${d}-${m}-${y}`;
    }

    $: schedules = (Res.fromSerial<[Timings, MaterializedCostRes], ProblemDetails[]>(data.result)
        .match({
            ok: (a: [Timings, MaterializedCostRes]): [Timings, MaterializedCostRes] => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e[0]);
                return null as never;
            }
        }) satisfies Promise<[Timings, MaterializedCostRes]>)


    const date: string = $page.url.searchParams.get("date") ?? "";
    const direction: string = $page.url.searchParams.get("direction") ?? "WToJ";

    let bindDate: DateValue = toCalDate(date);
    let bindDirection: string = direction;

    const df = new DateFormatter("en-US", {
        dateStyle: "long"
    });

    async function dateChange() {
        await tick();
        triggerSearch();
    }

    async function directionChange() {

        await tick();
        triggerSearch();
    }

    function triggerSearch() {
        const d = toZincDate(bindDate);
        goto(`?date=${d}&direction=${bindDirection}`,
            {
                keepFocus: true,
                noScroll: true,
            }
        );
    }

    function displayTime(time: string): string {
        return new Date(`2021-01-01T${time}`).toLocaleTimeString(undefined, {
            timeStyle: 'short',
            hourCycle: "h12",
        });

    }

    function countColor(count: number): string {
        if (count < 5) return "bg-green-500";
        if (count < 10) return "bg-yellow-500";
        return "bg-red-500";
    }

    const minDate = today(getLocalTimeZone());

</script>

<div class="flex flex-col">
    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">

        <div class="flex flex-wrap justify-between w-full gap-4">
            <Popover.Root>
                <Popover.Trigger asChild let:builder>
                    <Button variant="outline"
                            class={cn("w-full max-w-sm lg:max-w-[240px] justify-start text-left font-normal",!bindDate && "text-muted-foreground")}
                            builders={[builder]}>
                        <CalendarIcon class="mr-2 h-4 w-4"/>
                        {bindDate ? df.format(bindDate.toDate(getLocalTimeZone())) : "Select a date"}
                    </Button>
                </Popover.Trigger>
                <Popover.Content class="w-auto p-0" align="start">
                    <Calendar minValue={minDate} bind:value={bindDate} onValueChange={dateChange}/>
                </Popover.Content>
            </Popover.Root>
            <ToggleGroup.Root type="single" bind:value={bindDirection} class="w-full max-w-sm lg:max-w-[240px]" onValueChange={directionChange}>
                <ToggleGroup.Item value="WToJ" aria-label="Woodlands to JB Sentral">
                    Woodlands to JB
                </ToggleGroup.Item>
                <ToggleGroup.Item value="JToW" aria-label="JB Sentral to Woodlands">
                    JB to Woodlands
                </ToggleGroup.Item>
            </ToggleGroup.Root>
        </div>
        {#await schedules}
            <Loader/>
        {:then [timings, cost]}
            <Page notFoundMessage="No schedules found" empty={Object.entries(timings).length === 0}>
                <div class="flex flex-col gap-4 my-4">
                    {#each Object.entries(timings) as [time, count]}
                        <Card.Root>
                            <Card.Header>
                                <div class="flex justify-between items-center gap-8">
                                    <Card.Title>
                                        <div class="flex flex-wrap gap-2 justify-center items-center">
                                            <div class="w-24 text-center">
                                                {displayTime(time)}
                                            </div>
                                            <Badge class="text-center {countColor(count)}">{count} tickets in queue
                                            </Badge>

                                        </div>
                                    </Card.Title>
                                    <div class="flex gap-4 items-center flex-wrap justify-center">
                                        <div class="flex flex-col">
                                            <Card.Title>S${cost.final.toFixed(2)}</Card.Title>
                                            {#if cost.final != cost.cost}
                                                <div class="flex justify-center items-center gap-2">
                                                    <Card.Title class="line-through">
                                                        S${cost.cost.toFixed(2)}</Card.Title>
                                                    <Popover.Root>
                                                        <Popover.Trigger>
                                                            <LucideInfo class="w-4 h-4 hover:text-blue-500"/>
                                                        </Popover.Trigger>
                                                        <Popover.Content>
                                                            {#each cost.discounts as dd}
                                                                <div class="flex justify-between items-center text-xs">
                                                                    <div class="flex text-left flex-col justify-between">
                                                                        <div class="font-semibold">{dd.name}</div>
                                                                        <div class="text-muted-foreground">{dd.description}</div>

                                                                    </div>
                                                                    <div>{dd.type === "Flat" ? 'S$' : ''}{dd.amount.toFixed(2)}{dd.type === "Percentage" ? '%' : ''}</div>
                                                                </div>
                                                            {/each}
                                                        </Popover.Content>
                                                    </Popover.Root>
                                                </div>
                                            {/if}
                                        </div>
                                        <Button class="w-full max-w-24">Buy</Button>
                                    </div>

                                </div>

                            </Card.Header>

                        </Card.Root>
                    {/each}
                </div>
            </Page>
        {/await}
    </div>
</div>
