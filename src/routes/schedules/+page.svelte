<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    import type {ProblemDetails} from "../../errors/problem_details";
    import {Res} from "$lib/core/result";
    import {problem} from "../../store";
    import Loader from "$lib/components/complex/loader.svelte";
    import {goto, invalidateAll} from "$app/navigation";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    //@ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import {CalendarDate, type DateValue} from "@internationalized/date";
    import type {PageData} from "./$types";
    import type {CostSlotSummaryRes, DiscountRecordRes} from "$lib/api/core/data-contracts";
    import {tick} from "svelte";
    import {Button} from "$lib/components/ui/button";
    import {Separator} from "$lib/components/ui/separator";
    import {page} from "$app/stores";
    import type {Timings} from "./typing";
    import {Badge} from "$lib/components/ui/badge";
    import {CalendarIcon, LucideInfo} from "lucide-svelte";
    import {cn} from "$lib/utils";
    import {Calendar} from "$lib/components/ui/calendar";
    import {format, parse} from "date-fns";
    import {discountSteps} from "$lib/api/cost";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatNumber, formatCalendarDate, formatClockTime} from "$lib/i18n";
    import {calendarDateForDisplay, singaporeToday} from "$lib/time/singapore";
    import LivePricingRefresh from "$lib/components/entities/Costs/LivePricingRefresh.svelte";

    export let data: PageData;

    // Util
    function toCalDate(s: string): DateValue | undefined {
        if (s == "") return singaporeToday();
        const [d, m, y] = s.split("-");
        return new CalendarDate(parseInt(y), parseInt(m), parseInt(d));
    }

    function toZincDate(s?: DateValue): string {
        if (s == null) return "";
        if (s == null) return "";
        const t = parse(s.toString(), "yyyy-MM-dd", new Date())
        return format(t, "dd-MM-yyyy");
    }

    $: schedules = (Res.fromSerial<Timings, ProblemDetails[]>(data.result)
        .match({
            ok: (a: Timings): Timings => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e[0]);
                return null as never;
            }
        }) satisfies Promise<Timings>)


    const date: string = $page.url.searchParams.get("date") ?? "";
    const direction: string = $page.url.searchParams.get("direction") ?? "WToJ";

    let bindDate: DateValue = toCalDate(date);
    let bindDirection: string = direction;

    async function dateChange() {
        await tick();
        triggerSearch();
    }

    async function directionChange() {

        await tick();
        triggerSearch();
    }

    function triggerSearch() {
        if(bindDate == null) bindDate = toCalDate(date);
        console.log(bindDate);
        let d = toZincDate(bindDate);
        // if (d == null) d = toZincDate(toCalDate(date))

        if (bindDirection == null) bindDirection = "WToJ"

        goto(`?date=${d}&direction=${bindDirection}`,
            {
                keepFocus: true,
                noScroll: true,
            }
        );
    }

    function displayTime(time: string): string {
        return formatClockTime(time, $lang, {hourCycle: "h12"});
    }

    function countColor(count: number): string {
        if (count < 5) return "bg-green-500";
        if (count < 10) return "bg-yellow-500";
        return "bg-red-500";
    }

    // Per-slot ACTUAL prices only. If batch pricing fails, buying is blocked
    // rather than showing Cost/self, which cannot apply slot targeting.
    $: slotMap = new Map<string, CostSlotSummaryRes>(
        (data.slotSummaries ?? []).map((s) => [s.time ?? "", s]));

    function signedDelta(delta: number): string {
        const sign = delta >= 0 ? "+" : "−";
        return `${sign}${formatMoney(Math.abs(delta), $lang)}`;
    }

    function discountLabel(d: DiscountRecordRes): string {
        return d.type === "Flat"
            ? `−${formatMoney(d.amount, $lang)}`
            : `−${formatNumber(d.amount * 100, $lang)}%`;
    }

    const minDate = singaporeToday();

    function track() {
        (window as any)?.fathom?.trackEvent('Select Date To Buy')
    }

    $: currDate = toZincDate(bindDate);

</script>

<LivePricingRefresh/>

<div class="flex flex-col">
    <div class="border-b bg-muted ">
        <div class="flex justify-center sm:justify-between gap-4 flex-wrap py-8 items-center text-foreground max-w-[1200px] w-11/12 mx-auto">

            <div class="text-3xl lg:text-4xl">
                {$_("schedules.pageTitle", { locale: $lang })}

            </div>
            <div class="flex flex-col justify-center items-center font-light">
                <div class="text-2xl">{formatMoney($page.data.user?.wallet?.usable ?? 0, $lang)}</div>
                <div>{$_("fields.balance", { locale: $lang })}</div>
            </div>
        </div>

    </div>
    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">


        <div class="flex flex-wrap w-full gap-4 justify-center md:justify-between">
            <Popover.Root>
                <Popover.Trigger asChild let:builder>
                    <Button variant="outline"
                            class={cn("w-full max-w-sm lg:max-w-[240px] justify-start text-left font-normal",!bindDate && "text-muted-foreground")}
                            builders={[builder]}>
                        <CalendarIcon class="mr-2 h-4 w-4"/>
                        {bindDate ? formatCalendarDate(calendarDateForDisplay(bindDate), $lang, {dateStyle: "long"}) : $_("schedules.selectDate", { locale: $lang })}
                    </Button>
                </Popover.Trigger>
                <Popover.Content class="w-auto p-0" align="center">
                    <Calendar minValue={minDate} bind:value={bindDate} onValueChange={dateChange}/>
                </Popover.Content>
            </Popover.Root>
            <ToggleGroup.Root type="single" bind:value={bindDirection} class="w-full max-w-80 justify-center"
                              onValueChange={directionChange}>
                <ToggleGroup.Item value="WToJ" aria-label={$_("schedules.woodlandsToJbSentral", { locale: $lang })}>
                    {$_("schedules.woodlandsToJb", { locale: $lang })}
                </ToggleGroup.Item>
                <ToggleGroup.Item value="JToW" aria-label={$_("schedules.jbSentralToWoodlands", { locale: $lang })}>
                    {$_("schedules.jbToWoodlands", { locale: $lang })}
                </ToggleGroup.Item>
            </ToggleGroup.Root>
        </div>
        {#if data.slotPricingFailed}
            <div class="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                 role="alert">
                <p class="text-sm">{$_('schedules.pricingUnavailable', { locale: $lang })}</p>
                <Button variant="outline" class="h-11 shrink-0" on:click={() => invalidateAll()}>
                    {$_('actions.retry', { locale: $lang })}
                </Button>
            </div>
        {/if}
        {#await schedules}
            <Loader/>
        {:then timings}
            <Page notFoundMessage={$_("schedules.noSchedulesFound", { locale: $lang })} empty={Object.entries(timings).length === 0}>
                <div class="flex flex-col gap-4 my-4">
                    {#each Object.entries(timings) as [time, count]}
                        {@const slot = slotMap.get(time)}
                        <Card.Root>
                            <Card.Header>
                                <div class="flex justify-between items-center gap-8">
                                    <Card.Title>
                                        <div class="flex flex-wrap gap-2 justify-center items-center">
                                            <div class="flex flex-col gap-2">
                                                <div class="w-24 text-center">{displayTime(time)}</div>
                                                <div class="w-24 text-center text-slate-500 text-sm">{bindDate ? formatCalendarDate(calendarDateForDisplay(bindDate), $lang, {dateStyle: "medium"}) : ""}</div>
                                            </div>
                                            <div class="flex flex-col gap-2 items-center">
                                                <Badge class="text-center {countColor(count)}">{$_("schedules.ticketsInQueue", { locale: $lang, values: { count } })}
                                                </Badge>
                                            </div>


                                        </div>
                                    </Card.Title>
                                    <div class="flex gap-4 items-center flex-wrap justify-center">
                                        {#if slot != null}
                                            <!-- ACTUAL per-slot price: tapping it (or the info icon)
                                                 opens this slot's line-item breakdown. A struck-through
                                                 subtotal is the DISCOUNT signature; policy adjustments
                                                 are simply part of the shown price. -->
                                            <Popover.Root>
                                                <Popover.Trigger aria-label={`${formatMoney(slot.final, $lang)} — ${$_("schedules.breakdown.open", { locale: $lang })}`}>
                                                    <div class="flex flex-col items-center gap-1">
                                                        <div class="flex items-center gap-2">
                                                            <Card.Title>{formatMoney(slot.final, $lang)}</Card.Title>
                                                            <LucideInfo class="w-4 h-4 hover:text-blue-500"/>
                                                        </div>
                                                        {#if slot.final < slot.subtotal}
                                                            <Card.Title class="line-through text-muted-foreground">
                                                                {formatMoney(slot.subtotal, $lang)}
                                                            </Card.Title>
                                                        {/if}
                                                    </div>
                                                </Popover.Trigger>
                                                <Popover.Content class="w-80 max-w-[90vw]">
                                                    <div class="flex flex-col gap-1 text-sm">
                                                        <div class="flex justify-between items-center gap-8">
                                                            <div class="font-medium">{$_("schedules.breakdown.base", { locale: $lang })}</div>
                                                            <div>{formatMoney(slot.baseCost, $lang)}</div>
                                                        </div>
                                                        {#each slot.policyLines ?? [] as line}
                                                            <div class="flex justify-between items-center gap-8">
                                                                <div class="text-muted-foreground text-left">{line.name}</div>
                                                                <div>{signedDelta(line.delta)}</div>
                                                            </div>
                                                        {/each}
                                                        {#if (slot.policyLines ?? []).length > 0}
                                                            <Separator class="my-1"/>
                                                            <div class="flex justify-between items-center gap-8">
                                                                <div class="font-medium">{$_("schedules.breakdown.subtotal", { locale: $lang })}</div>
                                                                <div>{formatMoney(slot.subtotal, $lang)}</div>
                                                            </div>
                                                        {/if}
                                                        {#each discountSteps(slot.subtotal, slot.final, slot.discounts) as step}
                                                            <div class="flex justify-between items-center gap-8">
                                                                <div class="flex flex-col text-left">
                                                                    <div class="font-semibold">{step.discount.name}</div>
                                                                    {#if step.discount.description}
                                                                        <div class="text-xs text-muted-foreground">{step.discount.description}</div>
                                                                    {/if}
                                                                </div>
                                                                <div class="flex flex-col items-end">
                                                                    <div class="text-green-600 dark:text-green-400">{discountLabel(step.discount)}</div>
                                                                    <div>
                                                                        <span class="line-through text-muted-foreground">{formatMoney(step.before, $lang)}</span>
                                                                        {formatMoney(step.after, $lang)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        {/each}
                                                        <Separator class="my-1"/>
                                                        <div class="flex justify-between items-center gap-8">
                                                            <div class="font-bold">{$_("schedules.breakdown.final", { locale: $lang })}</div>
                                                            <div class="font-bold">{formatMoney(slot.final, $lang)}</div>
                                                        </div>
                                                    </div>
                                                </Popover.Content>
                                            </Popover.Root>
                                        {:else}
                                            <div class="text-sm font-medium text-destructive">
                                                {$_('schedules.priceUnavailable', { locale: $lang })}
                                            </div>
                                        {/if}
                                        {#if slot != null}
                                            <hr>
                                            <Button on:click={track} class="w-full max-w-24"
                                                    href="/bookings/purchase?date={currDate}&direction={bindDirection}&time={time}&userId={$page.data.user.principal.id}">
                                                {$_("schedules.buy", { locale: $lang })}
                                            </Button>
                                        {/if}
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
