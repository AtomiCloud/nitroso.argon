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
        DAYS, DIRECTIONS, DIR_DOT, DIR_TINT, BUCKETS, DEMAND_BUCKETS,
        aggregate, rateOf, rateClass, rateText, toStatRow, filterStatsRows, leadBucketMatches,
        deliveryMetricRows, completedWithDelivery, buildMatrixMetrics, singaporeToday, formatZincDate, parseZincDate,
        type BucketMode, type PriorityMode, type StatRow, type SuccessDefinition,
    } from "./stats";
    import StatTable from "./StatTable.svelte";
    import MilestoneManage from "./MilestoneManage.svelte";

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
    // The page is TABS over ONE shared filtered slice: Overview, Day × Time,
    // Lead time, Queue depth, Delivery lead — the global bar filters ALL tabs.

    // 24h wall-clock text from zinc's HH:mm:ss
    function hhmm(t: string | null | undefined): string {
        return (t ?? "").slice(0, 5);
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

    // ---- bucket aggregation mode (lead-time AND delivery ladders) ----
    // "per": each bucket stands alone (a la carte)
    // "le":  cumulative ≤ — each bucket row aggregates ALL rows at or under
    //        that bucket ("within X of departure")
    // "ge":  cumulative > — each bucket row aggregates rows beyond that
    //        upper-bound threshold ("more than X before departure")
    // A bucket FILTER follows the same semantics, so it feeds every tab
    // consistently. ≤ and > tell different stories — both exist.
    let bucketMode: BucketMode = "per";
    // ToggleGroup single allows deselecting; never leave the mode undefined
    $: if (!bucketMode) bucketMode = "per";

    // ---- client-side filters over the pre-grouped rows ----
    let selDay: Selected<string> | undefined;
    let selDirection: Selected<string> | undefined;
    let selTime: Selected<string> | undefined;
    let selBucket: Selected<string> | undefined;
    let selPriority: Selected<string> | undefined;

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
    });

    // ---- breakdown tables (Group | Total | Success % + raw n/d) ----

    // breakdown by day of week (Mon → Sun)
    $: byDay = DAYS
        .map(d => ({key: d, rs: filtered.filter(r => r.dayOfWeek === d)}))
        .filter(g => g.rs.length > 0)
        .map(g => toStatRow(g.key, $_(`stats.daysShort.${g.key.toLowerCase()}`, { locale: $lang }), "", g.rs, definition));

    // breakdown by departure time, one tinted row per (direction, time)
    $: byTime = [...new Set(filtered.map(r => `${r.direction ?? ""}|${r.time ?? ""}`))]
        .sort()
        .map(k => {
            const [dir, tm] = k.split("|");
            const rs = filtered.filter(r => (r.direction ?? "") === dir && (r.time ?? "") === tm);
            return toStatRow(k, tm === "" ? "—" : hhmm(tm), dir, rs, definition);
        });

    // breakdown by lead-time bucket (6h → 6m+); the cumulative modes turn
    // each row into a running total: ≤ over everything at-or-under the
    // bucket, > over everything beyond its upper threshold
    $: presentBuckets = filtered.length === 0 ? [] : [...BUCKETS];
    $: byBucket = presentBuckets.map(bk => toStatRow(
        bk,
        bucketLabel(bk, bucketMode, $lang),
        "",
        filtered.filter(r => leadBucketMatches(r.bucket, bk, bucketMode)),
        definition));

    // breakdown by queue depth — how many bookings competed for the slot
    $: byDemand = (filtered.length === 0 ? [] : DEMAND_BUCKETS)
        .map(db => ({key: db, rs: filtered.filter(r => r.demandBucket === db)}))
        .map(g => toStatRow(g.key, g.key, "", g.rs, definition)) as StatRow[];

    // ---- delivery lead (COMPLETED bookings only; deliveryBucket != null) ----
    // The denominator stays fixed at all completed bookings with a known
    // delivery bucket in the globally-filtered slice.
    $: deliveredTotal = completedWithDelivery(filtered);
    $: byDelivery = deliveryMetricRows(filtered, bucketMode)
        .map(r => ({...r, label: bucketLabel(r.key, bucketMode, $lang)}));

    // ---- 2D matrix: day-of-week × direction+time (transposed for mobile) ----
    // Zinc does not promise that both directions have disjoint clock times.
    // Keep direction in every key so equal HH:mm values never merge or inherit
    // the wrong tint. The visible label stays compact; screen readers also get
    // the direction represented visually by the row tint.
    type MatrixSlot = { key: string; direction: string; time: string };

    $: matrixSlots = [...new Map(filtered
        .filter(r => r.direction && r.time)
        .map(r => [`${r.direction}|${r.time}`, {
            key: `${r.direction}|${r.time}`,
            direction: r.direction ?? "",
            time: r.time ?? "",
        } satisfies MatrixSlot])).values()]
        .sort((a, b) => a.time.localeCompare(b.time) || a.direction.localeCompare(b.direction));
    $: matrixDays = DAYS.filter(d => filtered.some(r => r.dayOfWeek === d));
    $: matrix = buildMatrixMetrics(filtered, definition);

    // summary of the current filtered slice, under both definitions, with the
    // raw numerators/denominators visible (the owner's actuarial base)
    $: summary = aggregate(filtered);
    $: summaryRateRefund = rateOf(summary, "refund");
    $: summaryRateRefundCancel = rateOf(summary, "refundCancel");
    $: summaryDenRefund = summary.completed + summary.refunded;
    $: summaryDenRefundCancel = summary.completed + summary.refunded + summary.cancelled;

    // ---- tabs over the one shared slice ----
    let tab = "overview";
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
            <Tabs.Root bind:value={tab}>
                <div class="overflow-x-auto">
                    <Tabs.List class="w-max h-14">
                        <Tabs.Trigger value="overview" class="h-11 text-xs sm:text-sm px-3">{$_('stats.tabs.overview', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="matrix" class="h-11 text-xs sm:text-sm px-3">{$_('stats.tabs.matrix', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="leadTime" class="h-11 text-xs sm:text-sm px-3">{$_('stats.tabs.leadTime', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="queueDepth" class="h-11 text-xs sm:text-sm px-3">{$_('stats.tabs.queueDepth', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="delivery" class="h-11 text-xs sm:text-sm px-3">{$_('stats.tabs.delivery', { locale: $lang })}</Tabs.Trigger>
                    </Tabs.List>
                </div>

                <!-- 1. Overview: the filtered slice under both definitions,
                     raw numerators/denominators spelled out -->
                <Tabs.Content value="overview" class="flex flex-col gap-4">
                    <Card.Root>
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
                                    <span class="text-sm text-muted-foreground">{$_('stats.summary.successRefundOnly', { locale: $lang })}</span>
                                    <span class="text-2xl font-semibold {rateClass(summaryRateRefund)}">{rateText(summaryRateRefund, $lang)}</span>
                                    <span class="text-xs text-muted-foreground tabular-nums">{formatNumber(summary.completed, $lang)}/{formatNumber(summaryDenRefund, $lang)}</span>
                                </div>
                                <div class="flex flex-col">
                                    <span class="text-sm text-muted-foreground">{$_('stats.summary.successRefundCancel', { locale: $lang })}</span>
                                    <span class="text-2xl font-semibold {rateClass(summaryRateRefundCancel)}">{rateText(summaryRateRefundCancel, $lang)}</span>
                                    <span class="text-xs text-muted-foreground tabular-nums">{formatNumber(summary.completed, $lang)}/{formatNumber(summaryDenRefundCancel, $lang)}</span>
                                </div>
                            </div>
                        </Card.Content>
                    </Card.Root>
                </Tabs.Content>

                <!-- 2. Day × Time: the transposed matrix (timeslots as rows so
                     the many-item axis scrolls vertically on a phone; the 7
                     short day columns always fit) + the per-day and per-time
                     breakdown tables -->
                <Tabs.Content value="matrix" class="flex flex-col gap-4">
                    <Card.Root>
                        <Card.Header class="p-4 sm:p-6">
                            <Card.Title>{$_('stats.matrix.title', { locale: $lang })}</Card.Title>
                            <Card.Description>{$_('stats.matrix.description', { locale: $lang })}</Card.Description>
                        </Card.Header>
                        <Card.Content class="px-2 sm:px-6">
                            {#if matrixDays.length === 0 || matrixSlots.length === 0}
                                <p class="text-sm text-muted-foreground px-2">{$_('stats.empty', { locale: $lang })}</p>
                            {:else}
                                <!-- A row is one direction+timeslot pair, so equal
                                     clock times in opposite directions stay distinct. -->
                                <div class="overflow-x-auto">
                                    <Table.Root>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head class="h-8 px-2">{$_('stats.matrix.time', { locale: $lang })}</Table.Head>
                                                {#each matrixDays as d (d)}
                                                    <Table.Head class="h-8 px-1 text-center whitespace-nowrap">
                                                        {$_(`stats.daysShort.${d.toLowerCase()}`, { locale: $lang })}
                                                    </Table.Head>
                                                {/each}
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each matrixSlots as slot (slot.key)}
                                                <Table.Row class={DIR_TINT[slot.direction] ?? ''}>
                                                    <Table.Cell class="px-2 py-1 font-medium whitespace-nowrap">
                                                        {hhmm(slot.time)}
                                                        <span class="ml-1 rounded border px-1 text-[10px] font-normal">{$_(slot.direction === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang })}</span>
                                                    </Table.Cell>
                                                    {#each matrixDays as d (d)}
                                                        {@const c = matrix.get(`${slot.direction}|${slot.time}|${d}`)}
                                                        <Table.Cell class="px-1 py-1 text-center text-xs">
                                                            {#if c != null}
                                                                <span class="flex flex-col items-center leading-tight">
                                                                    <span class="font-medium {rateClass(c.rate)}">{rateText(c.rate, $lang)}</span>
                                                                    <span class="text-xs text-muted-foreground tabular-nums">{formatNumber(c.numerator, $lang)}/{formatNumber(c.denominator, $lang)}</span>
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
                                <!-- rate color scale (direction colors: see page legend) -->
                                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 px-2 text-xs text-muted-foreground">
                                    <span class="font-medium text-green-600 dark:text-green-400">≥80%</span>
                                    <span class="font-medium text-amber-600 dark:text-amber-400">50–79%</span>
                                    <span class="font-medium text-red-600 dark:text-red-400">&lt;50%</span>
                                    <span>{$_('stats.matrix.rateLegend', { locale: $lang })}</span>
                                </div>
                            {/if}
                        </Card.Content>
                    </Card.Root>
                    <StatTable title={$_('stats.table.byDay', { locale: $lang })} rows={byDay}/>
                    <StatTable title={$_('stats.table.byTime', { locale: $lang })} rows={byTime}/>
                </Tabs.Content>

                <!-- 3. Lead time: purchase → departure ladder, 3-mode toggle -->
                <Tabs.Content value="leadTime" class="flex flex-col gap-4">
                    <StatTable title={$_('stats.table.byBucket', { locale: $lang })} rows={byBucket}/>
                </Tabs.Content>

                <!-- 4. Queue depth: success rate by how contested the slot was -->
                <Tabs.Content value="queueDepth" class="flex flex-col gap-4">
                    <StatTable title={$_('stats.queue.title', { locale: $lang })} rows={byDemand}>
                        <InfoTip slot="info" label={$_('stats.queue.title', { locale: $lang })}>
                            {$_('stats.queue.info', { locale: $lang })}
                        </InfoTip>
                    </StatTable>
                </Tabs.Content>

                <!-- 5. Delivery lead: COMPLETED bookings only — how long before
                     departure the ticket was secured (share of all completed
                     in the slice; ≤/> readings via the global mode toggle) -->
                <Tabs.Content value="delivery" class="flex flex-col gap-4">
                    <Card.Root>
                        <Card.Header class="p-4 sm:p-6">
                            <Card.Title class="flex items-center gap-2">
                                {$_('stats.delivery.title', { locale: $lang })}
                                <InfoTip label={$_('stats.delivery.title', { locale: $lang })}>
                                    {$_('stats.delivery.info', { locale: $lang })}
                                </InfoTip>
                            </Card.Title>
                        </Card.Header>
                        <Card.Content class="px-2 sm:px-6">
                            {#if byDelivery.length === 0 || deliveredTotal === 0}
                                <p class="text-sm text-muted-foreground px-2">{$_('stats.empty', { locale: $lang })}</p>
                            {:else}
                                <div class="overflow-x-auto">
                                    <Table.Root>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head class="h-9 px-2">{$_('stats.delivery.bucket', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-9 px-2 text-right">{$_('stats.delivery.completed', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-9 px-2">{$_('stats.delivery.share', { locale: $lang })}</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each byDelivery as r (r.key)}
                                                <Table.Row>
                                                    <Table.Cell class="px-2 py-1.5 font-medium whitespace-nowrap">{r.label}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right">{formatNumber(r.completed, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5">
                                                        <div class="flex items-center gap-2 whitespace-nowrap">
                                                            <span class="w-12 sm:w-14 text-right font-medium">{r.share == null ? "—" : rateText(r.share, $lang)}</span>
                                                            <!-- a share of completions, not a success rate: neutral bar -->
                                                            <div class="h-1.5 w-12 sm:w-24 rounded bg-muted overflow-hidden">
                                                                {#if r.share != null}
                                                                    <div class="h-full bg-primary/60" style="width: {r.share}%"></div>
                                                                {/if}
                                                            </div>
                                                            <span class="text-xs text-muted-foreground tabular-nums">{formatNumber(r.numerator, $lang)}/{formatNumber(r.denominator, $lang)}</span>
                                                        </div>
                                                    </Table.Cell>
                                                </Table.Row>
                                            {/each}
                                        </Table.Body>
                                    </Table.Root>
                                </div>
                            {/if}
                        </Card.Content>
                    </Card.Root>
                </Tabs.Content>
            </Tabs.Root>
        {/if}
    </div>
</div>
