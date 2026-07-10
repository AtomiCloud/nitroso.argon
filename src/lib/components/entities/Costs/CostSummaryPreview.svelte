<script lang="ts">
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Select from "$lib/components/ui/select";
    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    //@ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import {Button} from "$lib/components/ui/button";
    import {Calendar} from "$lib/components/ui/calendar";
    import {Separator} from "$lib/components/ui/separator";
    import {CalendarIcon, Clock, LucideLoader} from "lucide-svelte";
    import type {Selected} from "bits-ui";
    import {type DateValue} from "@internationalized/date";
    import type {CostSummaryRes} from "$lib/api/core/data-contracts";
    import {api} from "../../../../store";
    import {toResult} from "$lib/utility";
    import {onMount} from "svelte";
    import {cn} from "$lib/utils";
    import {_} from "svelte-i18n";
    import {lang, formatCalendarDate, formatClockTime, formatMoney, formatNumber} from "$lib/i18n";
    import {HALF_HOURS} from "./times";
    import {calendarDateForDisplay, singaporeToday} from "$lib/time/singapore";
    import LivePricingRefresh from "./LivePricingRefresh.svelte";

    // Live pricing preview: pick a hypothetical booking (date, time,
    // direction) with tap controls only, then show GET Cost/summary as an
    // itemized breakdown that visibly adds up: base + policy lines = subtotal,
    // less discounts = final.
    export let timesJToW: string[] = [];
    export let timesWToJ: string[] = [];

    let mounted = false;
    onMount(() => {
        mounted = true;
    });

    let date: DateValue | undefined = singaporeToday();
    let direction = "WToJ";
    $: if (!direction) direction = "WToJ";
    let selTime: Selected<string> | undefined = undefined;

    $: timeOptions = (direction === "JToW" ? timesJToW : timesWToJ);
    $: options = timeOptions.length > 0 ? timeOptions : HALF_HOURS;
    // a time only makes sense within its direction's timetable
    $: if (selTime?.value && !options.includes(selTime.value)) selTime = undefined;

    function toZincDate(d: DateValue): string {
        return `${String(d.day).padStart(2, "0")}-${String(d.month).padStart(2, "0")}-${d.year}`;
    }

    let summary: CostSummaryRes | null = null;
    let loading = false;
    let failed = false;
    let fetchedSig = "";

    $: sig = JSON.stringify([date == null ? "" : toZincDate(date), selTime?.value ?? "", direction]);
    $: if (mounted && date != null && selTime?.value && direction && sig !== fetchedSig) loadSummary(sig);

    async function loadSummary(s: string) {
        fetchedSig = s;
        if (date == null || !selTime?.value) return;
        loading = true;
        await toResult(() => $api.vCostSummaryDetail("1", {
            Date: toZincDate(date as DateValue),
            Time: selTime?.value ?? "",
            Direction: direction,
        }), $_('admin.costs.preview.loadError', {locale: $lang})).match({
            ok: (r: CostSummaryRes) => {
                if (fetchedSig === s) {
                    summary = r;
                    failed = false;
                }
            },
            err: (e) => {
                console.error(e);
                if (fetchedSig === s) {
                    summary = null;
                    failed = true;
                }
            }
        });
        loading = false;
    }

    function refreshSummary() {
        if (!loading && date != null && selTime?.value && direction) loadSummary(sig);
    }

    function signedMoney(delta: number): string {
        const sign = delta >= 0 ? "+" : "−";
        return `${sign}${formatMoney(Math.abs(delta), $lang)}`;
    }
</script>

<LivePricingRefresh on:refresh={refreshSummary}/>

<Card.Root>
    <Card.Header>
        <Card.Title>{$_('admin.costs.preview.title', {locale: $lang})}</Card.Title>
        <Card.Description>{$_('admin.costs.preview.description', {locale: $lang})}</Card.Description>
    </Card.Header>
    <Card.Content>
        <div class="flex flex-col gap-4">
            <div class="flex gap-4 flex-wrap items-center">
                <Popover.Root>
                    <Popover.Trigger asChild let:builder>
                        <Button variant="outline"
                                class={cn("w-full lg:max-w-60 justify-start text-left font-normal", !date && "text-muted-foreground")}
                                builders={[builder]}>
                            <CalendarIcon class="mr-2 h-4 w-4"/>
                            {date
                                ? formatCalendarDate(calendarDateForDisplay(date), $lang, {dateStyle: "long"})
                                : $_('admin.costs.preview.pickDate', {locale: $lang})}
                        </Button>
                    </Popover.Trigger>
                    <Popover.Content class="w-auto p-0" align="start">
                        <Calendar bind:value={date}/>
                    </Popover.Content>
                </Popover.Root>
                <ToggleGroup.Root type="single" bind:value={direction} class="w-full lg:max-w-80">
                    <ToggleGroup.Item value="WToJ" aria-label={$_('bookings.list.woodlandsToJbSentral', {locale: $lang})}>
                        {$_('bookings.list.woodlandsToJb', {locale: $lang})}
                    </ToggleGroup.Item>
                    <ToggleGroup.Item value="JToW" aria-label={$_('bookings.list.jbSentralToWoodlands', {locale: $lang})}>
                        {$_('bookings.list.jbToWoodlands', {locale: $lang})}
                    </ToggleGroup.Item>
                </ToggleGroup.Root>
                <Select.Root bind:selected={selTime}>
                    <Select.Trigger class="w-full lg:max-w-52">
                        <Clock class="mr-2 h-4 w-4"/>
                        <Select.Value placeholder={$_('admin.costs.preview.pickTime', {locale: $lang})}/>
                    </Select.Trigger>
                    <Select.Content class="max-h-64 overflow-y-auto">
                        {#each options as t (t)}
                            <Select.Item value={t} label={formatClockTime(t, $lang)}>
                                {formatClockTime(t, $lang)}
                            </Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>

            {#if selTime?.value == null}
                <p class="text-sm text-muted-foreground">{$_('admin.costs.preview.hint', {locale: $lang})}</p>
            {:else if loading && summary == null}
                <div class="flex justify-center py-4">
                    <LucideLoader class="h-5 w-5 animate-spin text-muted-foreground"/>
                </div>
            {:else if failed}
                <p class="text-sm text-destructive">{$_('admin.costs.preview.loadError', {locale: $lang})}</p>
            {:else if summary != null}
                <div class="flex flex-col gap-1 {loading ? 'opacity-60' : ''}">
                    <div class="flex justify-between items-center">
                        <div class="font-medium">{$_('admin.costs.preview.base', {locale: $lang})}</div>
                        <div>{formatMoney(summary.baseCost, $lang)}</div>
                    </div>
                    {#each summary.policyLines ?? [] as line}
                        <div class="flex justify-between items-center text-sm">
                            <div class="text-muted-foreground">{line.name}</div>
                            <div class={line.delta >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                                {signedMoney(line.delta)}
                            </div>
                        </div>
                    {/each}
                    <Separator class="my-2"/>
                    <div class="flex justify-between items-center">
                        <div class="font-medium">{$_('admin.costs.preview.subtotal', {locale: $lang})}</div>
                        <div>{formatMoney(summary.subtotal, $lang)}</div>
                    </div>
                    {#each summary.discounts ?? [] as d}
                        <div class="flex justify-between items-center text-sm">
                            <div class="text-muted-foreground">{d.name}</div>
                            <div class="text-green-600 dark:text-green-400">
                                {#if d.type === "Flat"}
                                    −{formatMoney(d.amount, $lang)}
                                {:else}
                                    −{formatNumber(d.amount * 100, $lang)}%
                                {/if}
                            </div>
                        </div>
                    {/each}
                    <Separator class="my-2"/>
                    <div class="flex justify-between items-center">
                        <div class="font-bold">{$_('admin.costs.preview.final', {locale: $lang})}</div>
                        <div class="font-bold">{formatMoney(summary.final, $lang)}</div>
                    </div>
                </div>
            {/if}
        </div>
    </Card.Content>
</Card.Root>
