<script lang="ts">
    import {onMount, tick} from "svelte";
    import {api} from "../../store";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";

    //@ts-ignore
    import * as Select from "$lib/components/ui/select";

    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";

    //@ts-ignore
    import * as Table from "$lib/components/ui/table";

    //@ts-ignore
    import * as Tabs from "$lib/components/ui/tabs";

    //@ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import {Calendar} from "$lib/components/ui/calendar";
    import {Button} from "$lib/components/ui/button";
    import {cn} from "$lib/utils";
    import type {Selected} from "bits-ui";
    import {getLocalTimeZone, type DateValue} from "@internationalized/date";
    import {CalendarIcon, Clock, CalendarDays, ArrowLeftRight, Flag, Hourglass, LucideLoader, RotateCw, Zap} from "lucide-svelte";
    import type {BookingStatRes, MilestoneRes} from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import Loader from "$lib/components/complex/loader.svelte";
    import InfoTip from "$lib/components/core/InfoTip.svelte";
    import {_} from "svelte-i18n";
    import {lang, formatCalendarDate, formatNumber} from "$lib/i18n";
    import {
        DAYS, DIRECTIONS, DIR_DOT, BUCKETS, DEMAND_BUCKETS, DELIVERY_BUCKETS,
        aggregate, rateClass, rateText, filterStatsRows,
        timeMetricRows, directionMetricRows, weekdayMetricRows, purchaseLeadMetricRows,
        slotLoadMetricRows, deliveryCutoffMetricRows, buildDayTimeMatrix, successMetricForRows,
        singaporeToday, formatZincDate, parseZincDate,
        type BucketMode, type PriorityMode, type StatRow, type SuccessDefinition,
    } from "./stats";
    import MilestoneManage from "./MilestoneManage.svelte";
    import RateBarChart from "./RateBarChart.svelte";

    // Admin-only booking statistics (same server-side gating as /fees — zinc
    // rejects non-admin reads and the nav link is only rendered for admins).
    // ONE call to GET Booking/stats per travel-date range; every other filter
    // and the success-rate definition toggle are pure client-side
    // re-aggregations of the returned rows, which zinc pre-groups by
    // (dayOfWeek, time, direction, lead-time bucket, priority, demandBucket,
    // deliveryBucket).
    //
    // Mobile-first (owner mandate — this page is mostly used on phones):
    // 24h clock only ("17:00", shorter than locale AM/PM), short day names
    // ("Mon"), compact cell padding, a sticky compact filter bar whose rows
    // scroll horizontally inside themselves, and direction shown purely by
    // COLOR (blue = W → JB, purple = JB → W) with one legend at the top —
    // direction text appears only in that legend and the direction filter.
    //
    // The page is seven VISUALIZATIONS over ONE shared filtered slice: time,
    // direction, weekday, purchase lead, delivery cutoff, historical slot
    // load, and the weekday × time heatmap. The global bar affects ALL tabs;
    // the summary sits above them because it describes the slice, not a view.

    // 24h wall-clock text from zinc's HH:mm:ss
    function hhmm(t: string | null | undefined): string {
        return (t ?? "").slice(0, 5);
    }

    function rateCellClass(rate: number | null): string {
        if (rate == null) return "bg-muted/40";
        if (rate >= 80) return "bg-green-500/20 ring-1 ring-inset ring-green-500/20";
        if (rate >= 50) return "bg-amber-500/20 ring-1 ring-inset ring-amber-500/20";
        return "bg-red-500/20 ring-1 ring-inset ring-red-500/20";
    }

    // ---- travel-date range ----
    // zinc's standard API date format, dd-MM-yyyy — CalendarDate.toString()
    // is ISO and gets rejected with a 400
    function toApiDate(d: DateValue): string {
        return formatZincDate(d) ?? "";
    }

    function shortDate(d: DateValue): string {
        return formatCalendarDate(d.toDate(getLocalTimeZone()), $lang, {
            day: "numeric",
            month: "short",
            year: "2-digit",
        });
    }

    function fromApiDate(s: string | null | undefined): DateValue | null {
        return parseZincDate(s);
    }

    // seed with the 90-day fallback; onMount swaps the start to the latest
    // milestone date when one exists
    const todaySgt = singaporeToday();
    const fallbackAfter = todaySgt.subtract({days: 90});
    let after: DateValue | undefined = fallbackAfter;
    let before: DateValue | undefined = todaySgt;
    $: rangeInvalid = after != null && before != null && after.compare(before) > 0;

    let rows: BookingStatRes[] = [];
    let loading = false;
    let failed = false;
    let loadRequest = 0;

    async function load() {
        const request = ++loadRequest;
        if (rangeInvalid) {
            loading = false;
            return;
        }
        loading = true;
        try {
            await toResult(() => $api.vBookingStatsDetail("1", {
                ...(after == null ? {} : {after: toApiDate(after)}),
                ...(before == null ? {} : {before: toApiDate(before)}),
            }), $_('stats.loadError', { locale: $lang })).match({
                ok: (r: BookingStatRes[]) => {
                    if (request !== loadRequest) return;
                    rows = r;
                    failed = false;
                },
                err: (e) => {
                    if (request !== loadRequest) return;
                    console.error(e);
                    failed = true;
                }
            });
        } finally {
            if (request === loadRequest) loading = false;
        }
    }

    // ---- milestones (range-start presets; newest date first from zinc) ----
    let milestones: MilestoneRes[] = [];
    let milestonesFailed = false;
    let milestonesLoading = false;
    let milestoneRequest = 0;
    let selMilestone: Selected<string> | undefined;

    function milestoneLabel(m: MilestoneRes): string {
        const date = fromApiDate(m.date);
        const label = date == null
            ? m.date
            : formatCalendarDate(date.toDate(getLocalTimeZone()), $lang, {dateStyle: "medium"});
        return `${m.label} · ${label}`;
    }

    async function loadMilestones() {
        const request = ++milestoneRequest;
        milestonesLoading = true;
        try {
            await toResult(() => $api.vMilestoneList("1"),
                $_('stats.milestone.loadFailed', { locale: $lang })).match({
                ok: (r: MilestoneRes[]) => {
                    if (request !== milestoneRequest) return;
                    milestones = r;
                    milestonesFailed = false;
                },
                err: (e) => {
                    if (request !== milestoneRequest) return;
                    console.error(e);
                    milestonesFailed = true;
                }
            });
        } finally {
            if (request === milestoneRequest) milestonesLoading = false;
        }
    }

    $: eligibleMilestones = milestones.filter(m => {
        const d = fromApiDate(m.date);
        return d != null && d.compare(todaySgt) <= 0;
    });

    function latestMilestone(): MilestoneRes | undefined {
        // Zinc returns newest date first, but derive defensively and ignore
        // future milestones: they cannot define a historical stats regime.
        let best: MilestoneRes | undefined;
        let bestD: DateValue | null = null;
        for (const m of milestones) {
            const d = fromApiDate(m.date);
            if (d == null || d.compare(todaySgt) > 0) continue;
            if (bestD == null || d.compare(bestD) > 0) {
                best = m;
                bestD = d;
            }
        }
        return best;
    }

    onMount(async () => {
        await loadMilestones();
        const latest = latestMilestone();
        const d = latest == null ? null : fromApiDate(latest.date);
        // default range start = the LATEST milestone date (fallback: the
        // seeded last-90-days start); never start the range after its end
        if (latest != null && d != null) {
            after = d;
            selMilestone = {value: latest.id, label: milestoneLabel(latest)};
        }
        await load();
    });

    // picking a milestone snaps the range start to its date; the calendar
    // popover can still override afterwards
    function milestonePick(s: Selected<string> | undefined) {
        const m = eligibleMilestones.find(x => x.id === s?.value);
        const d = fromApiDate(m?.date);
        if (d != null && d.compare(todaySgt) <= 0) {
            after = d;
            load();
        }
    }

    // After an admin mutation, the newest non-future milestone becomes the
    // active regime immediately. With none left, restore the 90-day fallback.
    async function refreshMilestones() {
        await loadMilestones();
        const latest = latestMilestone();
        const d = fromApiDate(latest?.date);
        if (latest != null && d != null) {
            after = d;
            selMilestone = {value: latest.id, label: milestoneLabel(latest)};
        } else {
            after = fallbackAfter;
            selMilestone = undefined;
        }
        await load();
    }

    async function retryMilestones() {
        await loadMilestones();
        if (milestonesFailed) return;
        const latest = latestMilestone();
        const d = fromApiDate(latest?.date);
        if (latest != null && d != null) {
            after = d;
            selMilestone = {value: latest.id, label: milestoneLabel(latest)};
        } else {
            after = fallbackAfter;
            selMilestone = undefined;
        }
        await load();
    }

    async function rangeChange() {
        await tick();
        // a manual calendar override invalidates the milestone preset label
        const sel = selMilestone;
        if (sel?.value) {
            const m = milestones.find(x => x.id === sel.value);
            if (after == null || m?.date !== toApiDate(after)) selMilestone = undefined;
        }
        load();
    }

    // ---- success-rate definition toggle ----
    // "refund":       success = completed / (completed + refunded)
    // "refundCancel": success = completed / (completed + refunded + cancelled)
    let definition: SuccessDefinition = "refund";
    // ToggleGroup single allows deselecting; never leave the page undefined
    $: if (!definition) definition = "refund";

    // ---- purchase lead-time bucket aggregation mode ----
    // "per": each bucket stands alone (a la carte)
    // "le":  cumulative ≤ — each bucket row aggregates ALL rows at or under
    //        that bucket ("within X of departure")
    // "ge":  cumulative > — each bucket row aggregates rows beyond that
    //        upper-bound threshold ("more than X before departure")
    // The purchase lead filter follows the same semantics, so it feeds every
    // tab consistently. ≤ and > tell different stories — both exist.
    let bucketMode: BucketMode = "per";
    // ToggleGroup single allows deselecting; never leave the mode undefined
    $: if (!bucketMode) bucketMode = "per";

    // ---- client-side filters over the pre-grouped rows ----
    let selDay: Selected<string> | undefined;
    let selDirection: Selected<string> | undefined;
    let selTime: Selected<string> | undefined;
    let selBucket: Selected<string> | undefined;
    let selPriority: Selected<string> | undefined;
    let selDemand: Selected<string> | undefined;
    let selDeliveryCutoff: Selected<string> | undefined;

    // Keep closed-trigger labels in the active locale (same treatment as the
    // bookings list selects).
    $: if (selMilestone?.value) {
        const milestone = eligibleMilestones.find(m => m.id === selMilestone?.value);
        if (milestone != null) {
            const label = milestoneLabel(milestone);
            if (selMilestone.label !== label) selMilestone = {...selMilestone, label};
        }
    }
    $: if (selDay != null) {
        const l = selDay.value
            ? $_(`stats.daysShort.${selDay.value.toLowerCase()}`, { locale: $lang })
            : $_('stats.filters.all', { locale: $lang });
        if (selDay.label !== l) selDay = { ...selDay, label: l };
    }
    $: if (selDirection != null) {
        const l = selDirection.value
            ? $_(selDirection.value === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang })
            : $_('stats.filters.all', { locale: $lang });
        if (selDirection.label !== l) selDirection = { ...selDirection, label: l };
    }
    $: if (selTime != null) {
        const l = selTime.value ? hhmm(selTime.value) : $_('stats.filters.all', { locale: $lang });
        if (selTime.label !== l) selTime = { ...selTime, label: l };
    }
    // The bucket trigger mirrors the active mode's semantics ("24h" / "≤ 24h"
    // / "> 24h") so the filter never reads ambiguously.
    $: if (selBucket != null) {
        const l = selBucket.value
            ? bucketLabel(selBucket.value, bucketMode, $lang)
            : $_('stats.filters.all', { locale: $lang });
        if (selBucket.label !== l) selBucket = { ...selBucket, label: l };
    }
    $: if (selPriority != null) {
        const l = selPriority.value
            ? $_(`stats.priority.${selPriority.value}`, { locale: $lang })
            : $_('stats.filters.all', { locale: $lang });
        if (selPriority.label !== l) selPriority = { ...selPriority, label: l };
    }
    $: if (selDemand != null) {
        const l = selDemand.value
            ? demandLabel(selDemand.value)
            : $_('stats.filters.all', { locale: $lang });
        if (selDemand.label !== l) selDemand = { ...selDemand, label: l };
    }
    $: if (selDeliveryCutoff != null) {
        const l = selDeliveryCutoff.value
            ? $_('stats.delivery.moreThan', { locale: $lang, values: { bucket: selDeliveryCutoff.value } })
            : $_('stats.filters.all', { locale: $lang });
        if (selDeliveryCutoff.label !== l) selDeliveryCutoff = { ...selDeliveryCutoff, label: l };
    }

    function demandLabel(bucket: string): string {
        // Zinc's stable wire values use adjacent upper bounds. Present the
        // intervals without an overlapping boundary to admins.
        return ({
            "0-5": "1–5",
            "5-10": "6–10",
            "10-20": "11–20",
            "20-30": "21–30",
            "30+": "31+",
        } as Record<string, string>)[bucket] ?? bucket;
    }

    function bucketLabel(bk: string, mode: string, l: typeof $lang): string {
        if (mode === "le" && bk.endsWith("+")) return $_('stats.bucketMode.all', { locale: l });
        if (mode === "le") return $_('stats.bucketMode.upTo', { locale: l, values: { bucket: bk } });
        if (mode === "ge") return $_('stats.bucketMode.moreThan', {
            locale: l,
            values: {bucket: bk.endsWith("+") ? bk.slice(0, -1) : bk},
        });
        return bk;
    }

    // Departure-time options come from the data itself, scoped to the selected
    // direction — a direction only serves its own timetable, so the select
    // must never offer the other direction's times.
    $: timesInData = [...new Set(rows
        .filter(r => !selDirection?.value || r.direction === selDirection.value)
        .map(r => r.time ?? ""))].filter(t => t !== "").sort();
    // Drop a stale time filter when a direction switch removes that slot.
    $: if (selTime?.value && !timesInData.includes(selTime.value)) selTime = undefined;
    // Bucket options limited to buckets actually present, in canonical order
    $: bucketsInData = BUCKETS.filter(bk => rows.some(r => r.bucket === bk));

    // The ONE filtered slice every tab reads. Keep this centralized so a
    // priority or lead-time selection cannot accidentally affect only one tab.
    $: priorityMode = (selPriority?.value || "all") as PriorityMode;
    $: filtered = filterStatsRows(rows, {
        day: selDay?.value,
        direction: selDirection?.value,
        time: selTime?.value,
        priority: priorityMode,
        leadBucket: selBucket?.value,
        leadMode: bucketMode,
        slotLoadBucket: selDemand?.value,
    });
    // Delivery cutoff is a global SLA selector, not a destructive row filter:
    // late/unknown completions stay in the denominator as misses.
    $: deliveryCutoff = selDeliveryCutoff?.value;

    // Every visualization below is a weighted grouping of the exact same
    // filtered rows and the exact same success/cutoff definition.
    $: byTime = timeMetricRows(filtered, definition, deliveryCutoff);
    $: byDirection = directionMetricRows(filtered, definition, deliveryCutoff).map(r => ({
        ...r,
        label: $_(r.key === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang }),
    }));
    $: byDay = weekdayMetricRows(filtered, definition, deliveryCutoff).map(r => ({
        ...r,
        label: $_(`stats.daysShort.${r.key.toLowerCase()}`, { locale: $lang }),
    }));
    $: byBucket = purchaseLeadMetricRows(filtered, definition, bucketMode, deliveryCutoff).map(r => ({
        ...r,
        label: bucketLabel(r.key, bucketMode, $lang),
    }));
    $: byDemand = slotLoadMetricRows(filtered, definition, deliveryCutoff).map(r => ({
        ...r,
        label: demandLabel(r.key),
    }));
    $: byDeliveryChart = deliveryCutoffMetricRows(filtered, definition).map(r => ({
        key: r.cutoff,
        label: $_('stats.delivery.moreThan', { locale: $lang, values: { bucket: r.cutoff } }),
        dir: "",
        total: summary.total,
        rate: r.rate,
        num: r.numerator,
        den: r.denominator,
    } satisfies StatRow));

    $: matrixModel = buildDayTimeMatrix(filtered, definition, deliveryCutoff);
    $: matrixTimes = matrixModel.times;
    $: matrixDays = matrixModel.days;
    $: matrix = matrixModel.cells;

    $: summary = aggregate(filtered);
    $: summaryMetric = successMetricForRows(filtered, definition, deliveryCutoff);

    // ---- tabs over the one shared slice ----
    let tab = "time";
</script>

<div class="flex flex-col">
    <div class="border-b bg-muted">
        <div class="flex justify-center sm:justify-between gap-4 flex-wrap py-8 items-center text-foreground max-w-[1200px] w-11/12 mx-auto">
            <div class="text-3xl lg:text-4xl">
                {$_('stats.title', { locale: $lang })}
            </div>
            <Button variant="outline" disabled={loading} on:click={load}>
                {#if loading}
                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                {:else}
                    <RotateCw class="mr-2 h-4 w-4"/>
                {/if}
                {$_('stats.reload', { locale: $lang })}
            </Button>
        </div>
    </div>
    <div class="flex flex-col gap-4 w-full px-2 sm:px-0 sm:w-11/12 max-w-[1200px] mx-auto my-4 sm:my-8">

        <!-- the ONE direction color legend for the whole page: every table row
             and matrix sub-cell uses these tints instead of direction text -->
        <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            {#each DIRECTIONS as d (d)}
                <span class="flex items-center gap-1.5">
                    <span class="inline-block h-2.5 w-2.5 rounded-full {DIR_DOT[d]}"></span>
                    <span class="text-muted-foreground">{$_(d === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang })}</span>
                </span>
            {/each}
        </div>

        <!-- GLOBAL filter bar: one shared state that narrows EVERY tab.
             Sticky + compact on mobile; each row scrolls horizontally inside
             itself (container-scoped) instead of wrapping into a tall stack -->
        <div class="sticky top-0 z-20 -mx-2 px-2 py-2 sm:mx-0 sm:px-3 bg-background/95 backdrop-blur border-b sm:border sm:rounded-lg flex flex-col gap-2">

            <!-- row 1: travel-date range (the only thing that refetches from
                 zinc) + milestone preset + admin milestone management -->
            <div class="overflow-x-auto">
                <div class="flex gap-2 items-center w-max">
                    <Popover.Root>
                        <Popover.Trigger asChild let:builder>
                            <Button variant="outline"
                                    class={cn("h-11 px-3 text-xs justify-start font-normal shrink-0", !after && "text-muted-foreground")}
                                    aria-label={`${$_('stats.range.after', { locale: $lang })}: ${after ? shortDate(after) : $_('stats.range.notSelected', { locale: $lang })}`}
                                    builders={[builder]}>
                                <CalendarIcon class="mr-1.5 h-4 w-4"/>
                                {after ? shortDate(after) : $_('stats.range.after', { locale: $lang })}
                            </Button>
                        </Popover.Trigger>
                        <Popover.Content class="w-auto p-0" align="start">
                            <Calendar bind:value={after} maxValue={before ?? todaySgt} onValueChange={rangeChange}/>
                        </Popover.Content>
                    </Popover.Root>
                    <span class="text-muted-foreground text-xs">→</span>
                    <Popover.Root>
                        <Popover.Trigger asChild let:builder>
                            <Button variant="outline"
                                    class={cn("h-11 px-3 text-xs justify-start font-normal shrink-0", !before && "text-muted-foreground")}
                                    aria-label={`${$_('stats.range.before', { locale: $lang })}: ${before ? shortDate(before) : $_('stats.range.notSelected', { locale: $lang })}`}
                                    builders={[builder]}>
                                <CalendarIcon class="mr-1.5 h-4 w-4"/>
                                {before ? shortDate(before) : $_('stats.range.before', { locale: $lang })}
                            </Button>
                        </Popover.Trigger>
                        <Popover.Content class="w-auto p-0" align="start">
                            <Calendar bind:value={before} minValue={after} maxValue={todaySgt} onValueChange={rangeChange}/>
                        </Popover.Content>
                    </Popover.Root>
                    <Select.Root bind:selected={selMilestone} onSelectedChange={milestonePick}>
                        <Select.Trigger class="h-11 w-52 text-xs shrink-0">
                            <Flag class="mr-1.5 h-4 w-4 shrink-0"/>
                            <Select.Value placeholder={$_('stats.milestone.select', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            {#if eligibleMilestones.length === 0}
                                <div class="px-2 py-1.5 text-xs text-muted-foreground">{$_('stats.milestone.empty', { locale: $lang })}</div>
                            {/if}
                            {#each eligibleMilestones as m (m.id)}
                                <Select.Item value={m.id}>{milestoneLabel(m)}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                    <MilestoneManage {milestones} today={todaySgt} {toApiDate} reload={refreshMilestones}/>
                </div>
            </div>

            {#if rangeInvalid}
                <p class="text-sm text-destructive" role="alert">{$_('stats.range.invalid', { locale: $lang })}</p>
            {/if}
            {#if milestonesFailed}
                <div class="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300" role="status">
                    <span>{$_('stats.milestone.loadFailed', { locale: $lang })}</span>
                    <Button variant="outline" class="h-11 px-3" disabled={milestonesLoading} on:click={retryMilestones}>
                        {$_('actions.retry', { locale: $lang })}
                    </Button>
                </div>
            {/if}

            <!-- row 2: slice filters (pure client-side re-aggregation) -->
            <div class="overflow-x-auto">
                <div class="flex gap-2 items-center w-max">
                    <Select.Root bind:selected={selDirection}>
                        <Select.Trigger class="h-11 w-40 text-xs shrink-0"
                                        aria-label={`${$_('stats.filters.direction', { locale: $lang })}: ${selDirection?.label ?? $_('stats.filters.all', { locale: $lang })}`}>
                            <ArrowLeftRight class="mr-1.5 h-4 w-4 shrink-0"/>
                            <Select.Value placeholder={$_('stats.filters.direction', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="">{$_('stats.filters.all', { locale: $lang })}</Select.Item>
                            {#each DIRECTIONS as d}
                                <Select.Item value={d}>
                                    <span class="inline-block h-2 w-2 rounded-full mr-2 {DIR_DOT[d]}"></span>
                                    {$_(d === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang })}
                                </Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                    <Select.Root bind:selected={selDay}>
                        <Select.Trigger class="h-11 w-40 text-xs shrink-0"
                                        aria-label={`${$_('stats.filters.day', { locale: $lang })}: ${selDay?.label ?? $_('stats.filters.all', { locale: $lang })}`}>
                            <CalendarDays class="mr-1.5 h-4 w-4 shrink-0"/>
                            <Select.Value placeholder={$_('stats.filters.day', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="">{$_('stats.filters.all', { locale: $lang })}</Select.Item>
                            {#each DAYS as d}
                                <Select.Item value={d}>{$_(`stats.daysShort.${d.toLowerCase()}`, { locale: $lang })}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                    <Select.Root bind:selected={selTime}>
                        <Select.Trigger class="h-11 w-40 text-xs shrink-0"
                                        aria-label={`${$_('stats.filters.time', { locale: $lang })}: ${selTime?.label ?? $_('stats.filters.all', { locale: $lang })}`}>
                            <Clock class="mr-1.5 h-4 w-4 shrink-0"/>
                            <Select.Value placeholder={$_('stats.filters.time', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="">{$_('stats.filters.all', { locale: $lang })}</Select.Item>
                            {#each timesInData as t}
                                <Select.Item value={t}>{hhmm(t)}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                    <Select.Root bind:selected={selBucket}>
                        <Select.Trigger class="h-11 w-40 text-xs shrink-0"
                                        aria-label={`${$_('stats.filters.bucket', { locale: $lang })}: ${selBucket?.label ?? $_('stats.filters.all', { locale: $lang })}`}>
                            <Hourglass class="mr-1.5 h-4 w-4 shrink-0"/>
                            <Select.Value placeholder={$_('stats.filters.bucket', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="">{$_('stats.filters.all', { locale: $lang })}</Select.Item>
                            {#each bucketsInData as bk}
                                <Select.Item value={bk}>{bucketLabel(bk, bucketMode, $lang)}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                    <Select.Root bind:selected={selPriority}>
                        <Select.Trigger class="h-11 w-40 text-xs shrink-0"
                                        aria-label={`${$_('stats.filters.priority', { locale: $lang })}: ${selPriority?.label ?? $_('stats.filters.all', { locale: $lang })}`}>
                            <Zap class="mr-1.5 h-4 w-4 shrink-0"/>
                            <Select.Value placeholder={$_('stats.filters.priority', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="">{$_('stats.filters.all', { locale: $lang })}</Select.Item>
                            <Select.Item value="priority">{$_('stats.priority.priority', { locale: $lang })}</Select.Item>
                            <Select.Item value="regular">{$_('stats.priority.regular', { locale: $lang })}</Select.Item>
                        </Select.Content>
                    </Select.Root>
                    <Select.Root bind:selected={selDemand}>
                        <Select.Trigger class="h-11 w-40 text-xs shrink-0"
                                        aria-label={`${$_('stats.filters.slotLoad', { locale: $lang })}: ${selDemand?.label ?? $_('stats.filters.all', { locale: $lang })}`}>
                            <Zap class="mr-1.5 h-4 w-4 shrink-0"/>
                            <Select.Value placeholder={$_('stats.filters.slotLoad', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="">{$_('stats.filters.all', { locale: $lang })}</Select.Item>
                            {#each DEMAND_BUCKETS as db}
                                <Select.Item value={db}>{demandLabel(db)}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                    <Select.Root bind:selected={selDeliveryCutoff}>
                        <Select.Trigger class="h-11 w-48 text-xs shrink-0"
                                        aria-label={`${$_('stats.filters.deliveryCutoff', { locale: $lang })}: ${selDeliveryCutoff?.label ?? $_('stats.filters.all', { locale: $lang })}`}>
                            <Hourglass class="mr-1.5 h-4 w-4 shrink-0"/>
                            <Select.Value placeholder={$_('stats.filters.deliveryCutoff', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="">{$_('stats.filters.all', { locale: $lang })}</Select.Item>
                            {#each DELIVERY_BUCKETS.slice(0, -1) as db}
                                <Select.Item value={db}>
                                    {$_('stats.delivery.moreThan', { locale: $lang, values: { bucket: db } })}
                                </Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
            </div>

            <!-- row 3: success definition + bucket aggregation mode (the long
                 help sentences live in InfoTips to keep the sticky bar short) -->
            <div class="overflow-x-auto">
                <div class="flex gap-2 items-center w-max">
                    <ToggleGroup.Root type="single" bind:value={definition} class="justify-start">
                        <ToggleGroup.Item value="refund" class="h-11 px-3 text-xs" aria-label={$_('stats.definition.refundOnly', { locale: $lang })}>
                            {$_('stats.definition.refundOnly', { locale: $lang })}
                        </ToggleGroup.Item>
                        <ToggleGroup.Item value="refundCancel" class="h-11 px-3 text-xs" aria-label={$_('stats.definition.refundCancel', { locale: $lang })}>
                            {$_('stats.definition.refundCancel', { locale: $lang })}
                        </ToggleGroup.Item>
                    </ToggleGroup.Root>
                    <InfoTip label={$_(definition === "refundCancel" ? 'stats.definition.refundCancel' : 'stats.definition.refundOnly', { locale: $lang })}>
                        {#if definition === "refundCancel"}
                            {$_('stats.definition.helpRefundCancel', { locale: $lang })}
                        {:else}
                            {$_('stats.definition.helpRefundOnly', { locale: $lang })}
                        {/if}
                    </InfoTip>
                    <span class="h-5 w-px bg-border"></span>
                    <ToggleGroup.Root type="single" bind:value={bucketMode} class="justify-start">
                        <ToggleGroup.Item value="per" class="h-11 px-3 text-xs" aria-label={$_('stats.bucketMode.per', { locale: $lang })}>
                            {$_('stats.bucketMode.per', { locale: $lang })}
                        </ToggleGroup.Item>
                        <ToggleGroup.Item value="le" class="h-11 px-3 text-xs" aria-label={$_('stats.bucketMode.cumulativeLe', { locale: $lang })}>
                            {$_('stats.bucketMode.cumulativeLe', { locale: $lang })}
                        </ToggleGroup.Item>
                        <ToggleGroup.Item value="ge" class="h-11 px-3 text-xs" aria-label={$_('stats.bucketMode.cumulativeGe', { locale: $lang })}>
                            {$_('stats.bucketMode.cumulativeGe', { locale: $lang })}
                        </ToggleGroup.Item>
                    </ToggleGroup.Root>
                    <InfoTip label={$_(bucketMode === "le" ? 'stats.bucketMode.cumulativeLe' : bucketMode === "ge" ? 'stats.bucketMode.cumulativeGe' : 'stats.bucketMode.per', { locale: $lang })}>
                        {#if bucketMode === "le"}
                            {$_('stats.bucketMode.helpCumulativeLe', { locale: $lang })}
                        {:else if bucketMode === "ge"}
                            {$_('stats.bucketMode.helpCumulativeGe', { locale: $lang })}
                        {:else}
                            {$_('stats.bucketMode.helpPer', { locale: $lang })}
                        {/if}
                    </InfoTip>
                </div>
            </div>
        </div>

        {#if failed}
            <div class="flex flex-col items-center gap-4 py-12">
                <p class="text-muted-foreground">{$_('stats.loadError', { locale: $lang })}</p>
                <Button variant="outline" disabled={loading} on:click={load}>
                    <RotateCw class="mr-2 h-4 w-4"/>
                    {$_('stats.reload', { locale: $lang })}
                </Button>
            </div>
        {:else if loading && rows.length === 0}
            <Loader/>
        {:else if rows.length === 0}
            <p class="text-center text-muted-foreground py-12">{$_('stats.empty', { locale: $lang })}</p>
        {:else if filtered.length === 0}
            <p class="text-center text-muted-foreground py-12">{$_('stats.empty', { locale: $lang })}</p>
        {:else}
            <!-- Summary belongs to the filtered slice, not to a visualization
                 tab. Changing tabs only changes the grouping on the x-axis. -->
            <Card.Root class="overflow-hidden border-primary/20 bg-gradient-to-br from-background via-background to-muted/40">
                <Card.Header class="p-4 sm:p-6">
                    <Card.Title>{$_('stats.summary.title', { locale: $lang })}</Card.Title>
                </Card.Header>
                <Card.Content class="px-4 sm:px-6">
                    <div class="flex gap-x-8 gap-y-4 flex-wrap">
                        <div class="flex flex-col">
                            <span class="text-sm text-muted-foreground">{$_('stats.summary.total', { locale: $lang })}</span>
                            <span class="text-2xl font-semibold">{formatNumber(summary.total, $lang)}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-sm text-muted-foreground">
                                {$_(definition === "refundCancel"
                                    ? 'stats.summary.successRefundCancel'
                                    : 'stats.summary.successRefundOnly', { locale: $lang })}
                            </span>
                            <span class="text-2xl font-semibold {rateClass(summaryMetric.rate)}">{rateText(summaryMetric.rate, $lang)}</span>
                            <span class="text-xs text-muted-foreground tabular-nums">{formatNumber(summaryMetric.numerator, $lang)}/{formatNumber(summaryMetric.denominator, $lang)}</span>
                            {#if deliveryCutoff}
                                <span class="mt-1 text-xs text-muted-foreground">
                                    {$_('stats.delivery.moreThan', { locale: $lang, values: { bucket: deliveryCutoff } })}
                                </span>
                            {/if}
                        </div>
                    </div>
                </Card.Content>
            </Card.Root>

            <Tabs.Root bind:value={tab}>
                <div class="overflow-x-auto border-b">
                    <Tabs.List class="w-max h-14 bg-transparent">
                        <Tabs.Trigger value="time" class="h-11 text-xs sm:text-sm px-3">{$_('stats.tabs.time', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="direction" class="h-11 text-xs sm:text-sm px-3">{$_('stats.tabs.direction', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="day" class="h-11 text-xs sm:text-sm px-3">{$_('stats.tabs.dayOfWeek', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="leadTime" class="h-11 text-xs sm:text-sm px-3">{$_('stats.tabs.leadTime', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="delivery" class="h-11 text-xs sm:text-sm px-3">{$_('stats.tabs.delivery', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="slotLoad" class="h-11 text-xs sm:text-sm px-3">{$_('stats.tabs.slotLoad', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="matrix" class="h-11 text-xs sm:text-sm px-3">{$_('stats.tabs.matrix', { locale: $lang })}</Tabs.Trigger>
                    </Tabs.List>
                </div>

                <Tabs.Content value="time" class="mt-4">
                    <RateBarChart title={$_('stats.table.byTime', { locale: $lang })} rows={byTime}/>
                </Tabs.Content>

                <Tabs.Content value="direction" class="mt-4">
                    <RateBarChart title={$_('stats.table.byDirection', { locale: $lang })} rows={byDirection}/>
                </Tabs.Content>

                <Tabs.Content value="day" class="mt-4">
                    <RateBarChart title={$_('stats.table.byDay', { locale: $lang })} rows={byDay}/>
                </Tabs.Content>

                <Tabs.Content value="leadTime" class="mt-4">
                    <RateBarChart title={$_('stats.table.byBucket', { locale: $lang })} rows={byBucket}/>
                </Tabs.Content>

                <Tabs.Content value="delivery" class="mt-4">
                    <RateBarChart
                        title={$_('stats.delivery.title', { locale: $lang })}
                        description={$_('stats.delivery.info', { locale: $lang })}
                        rows={byDeliveryChart}
                        selectedKey={selDeliveryCutoff?.value}
                    />
                </Tabs.Content>

                <Tabs.Content value="slotLoad" class="mt-4">
                    <RateBarChart
                        title={$_('stats.queue.title', { locale: $lang })}
                        description={$_('stats.queue.info', { locale: $lang })}
                        rows={byDemand}
                        selectedKey={selDemand?.value}
                    />
                </Tabs.Content>

                <!-- The requested orientation is fixed: weekdays are the
                     short vertical axis; departure times scroll horizontally. -->
                <Tabs.Content value="matrix" class="mt-4">
                    <Card.Root>
                        <Card.Header class="p-4 sm:p-6">
                            <Card.Title>{$_('stats.matrix.title', { locale: $lang })}</Card.Title>
                            <Card.Description>{$_('stats.matrix.description', { locale: $lang })}</Card.Description>
                        </Card.Header>
                        <Card.Content class="px-2 sm:px-6">
                            {#if matrixDays.length === 0 || matrixTimes.length === 0}
                                <p class="text-sm text-muted-foreground px-2">{$_('stats.empty', { locale: $lang })}</p>
                            {:else}
                                <div class="overflow-x-auto rounded-md border">
                                    <Table.Root class="w-max min-w-full">
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head class="sticky left-0 z-10 h-10 min-w-16 bg-background px-2">
                                                    {$_('stats.matrix.day', { locale: $lang })}
                                                </Table.Head>
                                                {#each matrixTimes as tm (tm)}
                                                    <Table.Head class="h-10 min-w-20 px-2 text-center whitespace-nowrap">{hhmm(tm)}</Table.Head>
                                                {/each}
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each matrixDays as d (d)}
                                                <Table.Row>
                                                    <Table.Cell class="sticky left-0 z-10 bg-background px-2 py-2 font-semibold whitespace-nowrap">
                                                        {$_(`stats.daysShort.${d.toLowerCase()}`, { locale: $lang })}
                                                    </Table.Cell>
                                                    {#each matrixTimes as tm (tm)}
                                                        {@const c = matrix.get(`${d}|${tm}`)}
                                                        <Table.Cell class="px-2 py-2 text-center text-xs">
                                                            {#if c != null}
                                                                <span class="flex min-h-11 min-w-16 flex-col items-center justify-center rounded-md leading-tight {rateCellClass(c.rate)}">
                                                                    <span class="font-semibold {rateClass(c.rate)}">{rateText(c.rate, $lang)}</span>
                                                                    <span class="text-[10px] text-muted-foreground tabular-nums">{formatNumber(c.numerator, $lang)}/{formatNumber(c.denominator, $lang)}</span>
                                                                </span>
                                                            {:else}
                                                                <span class="text-muted-foreground/50 select-none">—</span>
                                                            {/if}
                                                        </Table.Cell>
                                                    {/each}
                                                </Table.Row>
                                            {/each}
                                        </Table.Body>
                                    </Table.Root>
                                </div>
                                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 px-2 text-xs text-muted-foreground">
                                    <span class="font-medium text-green-600 dark:text-green-400">≥80%</span>
                                    <span class="font-medium text-amber-600 dark:text-amber-400">50–79%</span>
                                    <span class="font-medium text-red-600 dark:text-red-400">&lt;50%</span>
                                    <span>{$_('stats.matrix.rateLegend', { locale: $lang })}</span>
                                </div>
                            {/if}
                        </Card.Content>
                    </Card.Root>
                </Tabs.Content>
            </Tabs.Root>
        {/if}
    </div>
</div>
