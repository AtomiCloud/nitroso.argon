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
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import {Calendar} from "$lib/components/ui/calendar";
    import {Button} from "$lib/components/ui/button";
    import {cn} from "$lib/utils";
    import type {Selected} from "bits-ui";
    import {CalendarDate, type DateValue, getLocalTimeZone} from "@internationalized/date";
    import {CalendarIcon, Clock, CalendarDays, ArrowLeftRight, Hourglass, LucideLoader, RotateCw} from "lucide-svelte";
    import type {BookingStatRes} from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import Loader from "$lib/components/complex/loader.svelte";
    import {_} from "svelte-i18n";
    import {lang, formatCalendarDate, formatNumber} from "$lib/i18n";

    // Admin-only booking statistics (same server-side gating as /fees — zinc
    // rejects non-admin reads and the nav link is only rendered for admins).
    // ONE call to GET Booking/stats per travel-date range; every other filter
    // and the success-rate definition toggle are pure client-side
    // re-aggregations of the returned rows, which zinc pre-groups by
    // (dayOfWeek, time, direction, lead-time bucket).
    //
    // Mobile-first (owner mandate — this page is mostly used on phones):
    // 24h clock only ("17:00", shorter than locale AM/PM), short day names
    // ("Mon"), compact cell padding, and direction shown purely by COLOR
    // (blue = W → JB, purple = JB → W) with one legend at the top — direction
    // text appears only in that legend and the direction filter.

    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const DIRECTIONS = ["WToJ", "JToW"];
    // direction → consistent tint/dot used across every table and the matrix
    const DIR_TINT: Record<string, string> = {WToJ: "bg-blue-500/10", JToW: "bg-purple-500/10"};
    const DIR_DOT: Record<string, string> = {WToJ: "bg-blue-500", JToW: "bg-purple-500"};
    // lead-time buckets (purchase → departure), shortest first
    const BUCKETS = ["6h", "12h", "24h", "2d", "3d", "4d", "1w", "2w", "3w", "4w", "1m", "2m", "3m", "6m", "6m+"];

    // 24h wall-clock text from zinc's HH:mm:ss
    function hhmm(t: string | null | undefined): string {
        return (t ?? "").slice(0, 5);
    }

    // ---- travel-date range (default: the last 90 days) ----
    function toCalDate(d: Date): DateValue {
        return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }

    // zinc's standard API date format, dd-MM-yyyy — CalendarDate.toString()
    // is ISO and gets rejected with a 400
    function toApiDate(d: DateValue): string {
        const dd = String(d.day).padStart(2, "0");
        const mm = String(d.month).padStart(2, "0");
        return `${dd}-${mm}-${d.year}`;
    }

    const today = new Date();
    let after: DateValue | undefined = toCalDate(new Date(today.getTime() - 90 * 24 * 3600 * 1000));
    let before: DateValue | undefined = toCalDate(today);

    let rows: BookingStatRes[] = [];
    let loading = false;
    let failed = false;

    async function load() {
        loading = true;
        await toResult(() => $api.vBookingStatsDetail("1", {
            ...(after == null ? {} : {after: toApiDate(after)}),
            ...(before == null ? {} : {before: toApiDate(before)}),
        }), $_('stats.loadError', { locale: $lang })).match({
            ok: (r: BookingStatRes[]) => {
                rows = r;
                failed = false;
            },
            err: (e) => {
                console.error(e);
                failed = true;
            }
        });
        loading = false;
    }

    onMount(load);

    async function rangeChange() {
        await tick();
        load();
    }

    // ---- success-rate definition toggle ----
    // "refund":       success = completed / (completed + refunded)
    // "refundCancel": success = completed / (completed + refunded + cancelled)
    let definition = "refund";
    // ToggleGroup single allows deselecting; never leave the page undefined
    $: if (!definition) definition = "refund";

    // ---- bucket aggregation mode ----
    // "per": each lead-time bucket stands alone (a la carte)
    // "le":  cumulative ≤ — each bucket row aggregates ALL rows with lead
    //        time at or under that bucket ("booked within X of departure")
    // "ge":  cumulative ≥ — each bucket row aggregates ALL rows with lead
    //        time at or over that bucket ("booked at least X before")
    // A bucket FILTER follows the same semantics, so it feeds the matrix and
    // summary consistently. ≤ and ≥ tell different stories — both exist.
    let bucketMode = "per";
    // ToggleGroup single allows deselecting; never leave the mode undefined
    $: if (!bucketMode) bucketMode = "per";

    function bucketIdx(bk: string | null | undefined): number {
        return BUCKETS.indexOf(bk ?? "");
    }

    // ---- client-side filters over the pre-grouped rows ----
    let selDay: Selected<string> | undefined;
    let selDirection: Selected<string> | undefined;
    let selTime: Selected<string> | undefined;
    let selBucket: Selected<string> | undefined;

    // Keep closed-trigger labels in the active locale (same treatment as the
    // bookings list selects).
    $: if (selDay?.value) {
        const l = $_(`stats.daysShort.${selDay.value.toLowerCase()}`, { locale: $lang });
        if (selDay.label !== l) selDay = { ...selDay, label: l };
    }
    $: if (selDirection?.value) {
        const l = $_(selDirection.value === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang });
        if (selDirection.label !== l) selDirection = { ...selDirection, label: l };
    }
    $: if (selTime?.value) {
        const l = hhmm(selTime.value);
        if (selTime.label !== l) selTime = { ...selTime, label: l };
    }
    // The bucket trigger mirrors the active mode's semantics ("24h" / "≤ 24h"
    // / "≥ 24h") so the filter never reads ambiguously.
    $: if (selBucket?.value) {
        const l = bucketLabel(selBucket.value, bucketMode, $lang);
        if (selBucket.label !== l) selBucket = { ...selBucket, label: l };
    }

    function bucketLabel(bk: string, mode: string, l: typeof $lang): string {
        if (mode === "le") return $_('stats.bucketMode.upTo', { locale: l, values: { bucket: bk } });
        if (mode === "ge") return $_('stats.bucketMode.atLeast', { locale: l, values: { bucket: bk } });
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

    function bucketMatches(r: BookingStatRes, sel: string, mode: string): boolean {
        if (mode === "per") return r.bucket === sel;
        const i = bucketIdx(r.bucket);
        if (i === -1) return false;
        return mode === "ge" ? i >= bucketIdx(sel) : i <= bucketIdx(sel);
    }

    $: filtered = rows.filter(r =>
        (!selDay?.value || r.dayOfWeek === selDay.value) &&
        (!selDirection?.value || r.direction === selDirection.value) &&
        (!selTime?.value || r.time === selTime.value) &&
        (!selBucket?.value || bucketMatches(r, selBucket.value, bucketMode)));

    // ---- aggregation ----
    type Agg = {
        total: number;
        completed: number;
        refunded: number;
        cancelled: number;
    };

    function aggregate(rs: BookingStatRes[]): Agg {
        const a: Agg = {total: 0, completed: 0, refunded: 0, cancelled: 0};
        for (const r of rs) {
            a.total += r.total;
            a.completed += r.completed;
            a.refunded += r.refunded;
            a.cancelled += r.cancelled;
        }
        return a;
    }

    function failedOf(a: Agg, def: string): number {
        return a.refunded + (def === "refundCancel" ? a.cancelled : 0);
    }

    // null when no booking has resolved to success/failure yet
    function rateOf(a: Agg, def: string): number | null {
        const f = failedOf(a, def);
        const denominator = a.completed + f;
        return denominator === 0 ? null : (a.completed / denominator) * 100;
    }

    function rateClass(rate: number | null): string {
        if (rate == null) return "text-muted-foreground";
        if (rate >= 80) return "text-green-600 dark:text-green-400";
        if (rate >= 50) return "text-amber-600 dark:text-amber-400";
        return "text-red-600 dark:text-red-400";
    }

    function barClass(rate: number): string {
        if (rate >= 80) return "bg-green-500";
        if (rate >= 50) return "bg-amber-500";
        return "bg-red-500";
    }

    function rateText(rate: number | null): string {
        return rate == null ? "—" : `${formatNumber(rate, $lang, {maximumFractionDigits: 1})}%`;
    }

    type StatRow = {
        key: string;
        label: string;
        // direction is conveyed purely by row COLOR (owner mandate); empty =
        // no direction dimension for this row
        dir: string;
        total: number;
        rate: number | null;
    };

    function toStatRow(key: string, label: string, dir: string, rs: BookingStatRes[], def: string): StatRow {
        const a = aggregate(rs);
        return {key, label, dir, total: a.total, rate: rateOf(a, def)};
    }

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
    // bucket, ≥ over everything at-or-over it
    $: presentBuckets = BUCKETS.filter(bk => filtered.some(r => r.bucket === bk));
    $: byBucket = presentBuckets.map(bk => toStatRow(
        bk,
        bucketLabel(bk, bucketMode, $lang),
        "",
        filtered.filter(r => bucketMatches(r, bk, bucketMode)),
        definition));

    $: tables = [
        {title: $_('stats.table.byDay', { locale: $lang }), rows: byDay},
        {title: $_('stats.table.byTime', { locale: $lang }), rows: byTime},
        {title: $_('stats.table.byBucket', { locale: $lang }), rows: byBucket},
    ];

    // ---- 2D matrix: day-of-week (rows, Mon→Sun) × time-of-day (columns) ----
    // The many-item axis (timeslots) is the horizontal one so it can scroll;
    // the 7 days always fit vertically. Each departure time belongs to
    // exactly ONE direction (the J→W and W→J timetables are disjoint), so a
    // (day, time) cell holds a single value — the direction is conveyed by
    // tinting the whole column (header + cells, see page legend) while the
    // cell TEXT keeps the green/amber/red success-rate coloring.
    type MatrixCell = { rate: number | null; total: number };

    $: matrixTimes = [...new Set(filtered.map(r => r.time ?? ""))].filter(t => t !== "").sort();
    $: matrixDays = DAYS.filter(d => filtered.some(r => r.dayOfWeek === d));
    $: matrix = buildMatrix(filtered, definition);
    // each time's direction, derived from the data rows (for column tinting)
    $: timeDirection = deriveTimeDirection(rows);

    function deriveTimeDirection(rs: BookingStatRes[]): Map<string, string> {
        const m = new Map<string, string>();
        for (const r of rs) {
            if (!r.time || !r.direction) continue;
            if (!m.has(r.time)) m.set(r.time, r.direction);
        }
        return m;
    }

    function buildMatrix(rs: BookingStatRes[], def: string): Map<string, MatrixCell> {
        // group the (already bucket/filter-sliced) rows per (day, time)
        const groups = new Map<string, BookingStatRes[]>();
        for (const r of rs) {
            if (!r.dayOfWeek || !r.time) continue;
            const key = `${r.dayOfWeek}|${r.time}`;
            const g = groups.get(key);
            if (g == null) groups.set(key, [r]);
            else g.push(r);
        }
        const m = new Map<string, MatrixCell>();
        for (const [key, g] of groups) {
            const a = aggregate(g);
            m.set(key, {rate: rateOf(a, def), total: a.total});
        }
        return m;
    }

    // summary of the current filtered slice, under both definitions
    $: summary = aggregate(filtered);
    $: summaryRateRefund = rateOf(summary, "refund");
    $: summaryRateRefundCancel = rateOf(summary, "refundCancel");
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
    <div class="flex flex-col gap-4 w-full px-2 sm:px-0 sm:w-11/12 max-w-[1200px] mx-auto my-8 sm:my-12">

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

        <!-- travel-date range (the only thing that refetches from zinc) -->
        <div class="flex gap-4 flex-wrap items-center">
            <Popover.Root>
                <Popover.Trigger asChild let:builder>
                    <Button variant="outline"
                            class={cn("w-full lg:max-w-60 justify-start text-left font-normal", !after && "text-muted-foreground")}
                            builders={[builder]}>
                        <CalendarIcon class="mr-2 h-4 w-4"/>
                        {after ? formatCalendarDate(after.toDate(getLocalTimeZone()), $lang, {dateStyle: "long"}) : $_('stats.range.after', { locale: $lang })}
                    </Button>
                </Popover.Trigger>
                <Popover.Content class="w-auto p-0" align="start">
                    <Calendar bind:value={after} onValueChange={rangeChange}/>
                </Popover.Content>
            </Popover.Root>
            <span class="text-muted-foreground">→</span>
            <Popover.Root>
                <Popover.Trigger asChild let:builder>
                    <Button variant="outline"
                            class={cn("w-full lg:max-w-60 justify-start text-left font-normal", !before && "text-muted-foreground")}
                            builders={[builder]}>
                        <CalendarIcon class="mr-2 h-4 w-4"/>
                        {before ? formatCalendarDate(before.toDate(getLocalTimeZone()), $lang, {dateStyle: "long"}) : $_('stats.range.before', { locale: $lang })}
                    </Button>
                </Popover.Trigger>
                <Popover.Content class="w-auto p-0" align="start">
                    <Calendar bind:value={before} onValueChange={rangeChange}/>
                </Popover.Content>
            </Popover.Root>
            <p class="text-sm text-muted-foreground">
                {$_('stats.range.hint', { locale: $lang })}
            </p>
        </div>

        <!-- success-rate definition -->
        <div class="flex gap-4 flex-wrap items-center">
            <ToggleGroup.Root type="single" bind:value={definition} class="justify-start">
                <ToggleGroup.Item value="refund" aria-label={$_('stats.definition.refundOnly', { locale: $lang })}>
                    {$_('stats.definition.refundOnly', { locale: $lang })}
                </ToggleGroup.Item>
                <ToggleGroup.Item value="refundCancel" aria-label={$_('stats.definition.refundCancel', { locale: $lang })}>
                    {$_('stats.definition.refundCancel', { locale: $lang })}
                </ToggleGroup.Item>
            </ToggleGroup.Root>
            <p class="text-sm text-muted-foreground">
                {#if definition === "refundCancel"}
                    {$_('stats.definition.helpRefundCancel', { locale: $lang })}
                {:else}
                    {$_('stats.definition.helpRefundOnly', { locale: $lang })}
                {/if}
            </p>
        </div>

        <!-- lead-time bucket aggregation mode -->
        <div class="flex gap-4 flex-wrap items-center">
            <ToggleGroup.Root type="single" bind:value={bucketMode} class="justify-start flex-wrap">
                <ToggleGroup.Item value="per" aria-label={$_('stats.bucketMode.per', { locale: $lang })}>
                    {$_('stats.bucketMode.per', { locale: $lang })}
                </ToggleGroup.Item>
                <ToggleGroup.Item value="le" aria-label={$_('stats.bucketMode.cumulativeLe', { locale: $lang })}>
                    {$_('stats.bucketMode.cumulativeLe', { locale: $lang })}
                </ToggleGroup.Item>
                <ToggleGroup.Item value="ge" aria-label={$_('stats.bucketMode.cumulativeGe', { locale: $lang })}>
                    {$_('stats.bucketMode.cumulativeGe', { locale: $lang })}
                </ToggleGroup.Item>
            </ToggleGroup.Root>
            <p class="text-sm text-muted-foreground">
                {#if bucketMode === "le"}
                    {$_('stats.bucketMode.helpCumulativeLe', { locale: $lang })}
                {:else if bucketMode === "ge"}
                    {$_('stats.bucketMode.helpCumulativeGe', { locale: $lang })}
                {:else}
                    {$_('stats.bucketMode.helpPer', { locale: $lang })}
                {/if}
            </p>
        </div>

        <!-- client-side slice filters -->
        <div class="flex gap-4 flex-wrap justify-start">
            <Select.Root bind:selected={selDay}>
                <Select.Trigger class="w-full lg:max-w-52">
                    <CalendarDays class="mr-2 h-4 w-4"/>
                    <Select.Value placeholder={$_('stats.filters.day', { locale: $lang })}/>
                </Select.Trigger>
                <Select.Content>
                    <Select.Item value="">{$_('stats.filters.all', { locale: $lang })}</Select.Item>
                    {#each DAYS as d}
                        <Select.Item value={d}>{$_(`stats.daysShort.${d.toLowerCase()}`, { locale: $lang })}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
            <Select.Root bind:selected={selDirection}>
                <Select.Trigger class="w-full lg:max-w-52">
                    <ArrowLeftRight class="mr-2 h-4 w-4"/>
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
            <Select.Root bind:selected={selTime}>
                <Select.Trigger class="w-full lg:max-w-52">
                    <Clock class="mr-2 h-4 w-4"/>
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
                <Select.Trigger class="w-full lg:max-w-52">
                    <Hourglass class="mr-2 h-4 w-4"/>
                    <Select.Value placeholder={$_('stats.filters.bucket', { locale: $lang })}/>
                </Select.Trigger>
                <Select.Content>
                    <Select.Item value="">{$_('stats.filters.all', { locale: $lang })}</Select.Item>
                    {#each bucketsInData as bk}
                        <Select.Item value={bk}>{bk}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
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
        {:else}
            <!-- summary of the current filtered slice -->
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
                            <span class="text-2xl font-semibold {rateClass(summaryRateRefund)}">{rateText(summaryRateRefund)}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-sm text-muted-foreground">{$_('stats.summary.successRefundCancel', { locale: $lang })}</span>
                            <span class="text-2xl font-semibold {rateClass(summaryRateRefundCancel)}">{rateText(summaryRateRefundCancel)}</span>
                        </div>
                    </div>
                </Card.Content>
            </Card.Root>

            <!-- the three breakdown tables: Group | Total | Success % only -->
            {#each tables as t (t.title)}
                <Card.Root>
                    <Card.Header class="p-4 sm:p-6">
                        <Card.Title>{t.title}</Card.Title>
                    </Card.Header>
                    <Card.Content class="px-2 sm:px-6">
                        {#if t.rows.length === 0}
                            <p class="text-sm text-muted-foreground px-2">{$_('stats.empty', { locale: $lang })}</p>
                        {:else}
                            <div class="overflow-x-auto">
                                <Table.Root>
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.Head class="h-9 px-2">{$_('stats.table.group', { locale: $lang })}</Table.Head>
                                            <Table.Head class="h-9 px-2 text-right">{$_('stats.table.total', { locale: $lang })}</Table.Head>
                                            <Table.Head class="h-9 px-2">{$_('stats.table.rate', { locale: $lang })}</Table.Head>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {#each t.rows as r (r.key)}
                                            <Table.Row class={r.dir ? DIR_TINT[r.dir] : ""}>
                                                <Table.Cell class="px-2 py-1.5 font-medium whitespace-nowrap">{r.label}</Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right">{formatNumber(r.total, $lang)}</Table.Cell>
                                                <Table.Cell class="px-2 py-1.5">
                                                    <div class="flex items-center gap-2">
                                                        <span class="w-12 sm:w-14 text-right font-medium {rateClass(r.rate)}">{rateText(r.rate)}</span>
                                                        <div class="h-1.5 w-12 sm:w-24 rounded bg-muted overflow-hidden">
                                                            {#if r.rate != null}
                                                                <div class="h-full {barClass(r.rate)}" style="width: {r.rate}%"></div>
                                                            {/if}
                                                        </div>
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
            {/each}

            <!-- 2D matrix: days vertical (Mon→Sun), timeslots horizontal;
                 columns tinted by their time's one-and-only direction -->
            <Card.Root>
                <Card.Header class="p-4 sm:p-6">
                    <Card.Title>{$_('stats.matrix.title', { locale: $lang })}</Card.Title>
                    <Card.Description>{$_('stats.matrix.description', { locale: $lang })}</Card.Description>
                </Card.Header>
                <Card.Content class="px-2 sm:px-6">
                    {#if matrixDays.length === 0 || matrixTimes.length === 0}
                        <p class="text-sm text-muted-foreground px-2">{$_('stats.empty', { locale: $lang })}</p>
                    {:else}
                        <div class="overflow-x-auto">
                            <Table.Root>
                                <Table.Header>
                                    <Table.Row>
                                        <Table.Head class="h-8 px-2">{$_('stats.matrix.day', { locale: $lang })}</Table.Head>
                                        {#each matrixTimes as tm (tm)}
                                            <Table.Head class="h-8 px-1 text-center whitespace-nowrap {DIR_TINT[timeDirection.get(tm) ?? ''] ?? ''}">
                                                {hhmm(tm)}
                                            </Table.Head>
                                        {/each}
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {#each matrixDays as d (d)}
                                        <Table.Row>
                                            <Table.Cell class="px-2 py-1 font-medium whitespace-nowrap">{$_(`stats.daysShort.${d.toLowerCase()}`, { locale: $lang })}</Table.Cell>
                                            {#each matrixTimes as tm (tm)}
                                                {@const c = matrix.get(`${d}|${tm}`)}
                                                <Table.Cell class="px-1 py-1 text-center text-xs min-w-12 {DIR_TINT[timeDirection.get(tm) ?? ''] ?? ''}">
                                                    {#if c != null && c.rate != null}
                                                        <span class="font-medium {rateClass(c.rate)}">{rateText(c.rate)}</span>
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
        {/if}
    </div>
</div>
