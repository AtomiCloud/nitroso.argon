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
    import {lang, formatCalendarDate, formatClockTime, formatNumber} from "$lib/i18n";

    // Admin-only booking statistics (same server-side gating as /fees — zinc
    // rejects non-admin reads and the nav link is only rendered for admins).
    // ONE call to GET Booking/stats per travel-date range; every other filter
    // and the success-rate definition toggle are pure client-side
    // re-aggregations of the returned rows, which zinc pre-groups by
    // (dayOfWeek, time, direction, lead-time bucket).

    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const DIRECTIONS = ["WToJ", "JToW"];
    // lead-time buckets (purchase → departure), shortest first
    const BUCKETS = ["6h", "12h", "24h", "2d", "3d", "4d", "1w", "2w", "3w", "4w", "1m", "2m", "3m", "6m", "6m+"];

    // ---- travel-date range (default: the last 90 days) ----
    function toCalDate(d: Date): DateValue {
        return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
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
            // CalendarDate.toString() is exactly the "yyyy-MM-dd" zinc expects
            ...(after == null ? {} : {after: after.toString()}),
            ...(before == null ? {} : {before: before.toString()}),
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

    // ---- client-side filters over the pre-grouped rows ----
    let selDay: Selected<string> | undefined;
    let selDirection: Selected<string> | undefined;
    let selTime: Selected<string> | undefined;
    let selBucket: Selected<string> | undefined;

    // Keep closed-trigger labels in the active locale (same treatment as the
    // bookings list selects).
    $: if (selDay?.value) {
        const l = $_(`stats.days.${selDay.value.toLowerCase()}`, { locale: $lang });
        if (selDay.label !== l) selDay = { ...selDay, label: l };
    }
    $: if (selDirection?.value) {
        const l = $_(selDirection.value === "WToJ" ? 'bookings.list.woodlandsToJb' : 'bookings.list.jbToWoodlands', { locale: $lang });
        if (selDirection.label !== l) selDirection = { ...selDirection, label: l };
    }
    $: if (selTime?.value) {
        const l = formatClockTime(selTime.value, $lang);
        if (selTime.label !== l) selTime = { ...selTime, label: l };
    }

    // Departure-time options come from the data itself
    $: timesInData = [...new Set(rows.map(r => r.time ?? ""))].filter(t => t !== "").sort();
    // Bucket options limited to buckets actually present, in canonical order
    $: bucketsInData = BUCKETS.filter(bk => rows.some(r => r.bucket === bk));

    $: filtered = rows.filter(r =>
        (!selDay?.value || r.dayOfWeek === selDay.value) &&
        (!selDirection?.value || r.direction === selDirection.value) &&
        (!selTime?.value || r.time === selTime.value) &&
        (!selBucket?.value || r.bucket === selBucket.value));

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
        total: number;
        completed: number;
        failed: number;
        rate: number | null;
    };

    function toStatRow(key: string, label: string, rs: BookingStatRes[], def: string): StatRow {
        const a = aggregate(rs);
        return {key, label, total: a.total, completed: a.completed, failed: failedOf(a, def), rate: rateOf(a, def)};
    }

    // breakdown by day of week (Monday → Sunday)
    $: byDay = DAYS
        .map(d => ({key: d, rs: filtered.filter(r => r.dayOfWeek === d)}))
        .filter(g => g.rs.length > 0)
        .map(g => toStatRow(g.key, $_(`stats.days.${g.key.toLowerCase()}`, { locale: $lang }), g.rs, definition));

    // breakdown by departure time, grouped per direction
    $: byTime = [...new Set(filtered.map(r => `${r.direction ?? ""}|${r.time ?? ""}`))]
        .sort()
        .map(k => {
            const [dir, tm] = k.split("|");
            const rs = filtered.filter(r => (r.direction ?? "") === dir && (r.time ?? "") === tm);
            const dirLabel = $_(dir === "WToJ" ? 'bookings.list.woodlandsToJb' : 'bookings.list.jbToWoodlands', { locale: $lang });
            return toStatRow(k, `${dirLabel} · ${tm === "" ? "—" : formatClockTime(tm, $lang)}`, rs, definition);
        });

    // breakdown by lead-time bucket (6h → 6m+)
    $: byBucket = BUCKETS
        .map(bk => ({key: bk, rs: filtered.filter(r => r.bucket === bk)}))
        .filter(g => g.rs.length > 0)
        .map(g => toStatRow(g.key, g.key, g.rs, definition));

    $: tables = [
        {title: $_('stats.table.byDay', { locale: $lang }), rows: byDay},
        {title: $_('stats.table.byTime', { locale: $lang }), rows: byTime},
        {title: $_('stats.table.byBucket', { locale: $lang }), rows: byBucket},
    ];

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
    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">

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
                        <Select.Item value={d}>{$_(`stats.days.${d.toLowerCase()}`, { locale: $lang })}</Select.Item>
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
                        <Select.Item value={d}>{$_(d === "WToJ" ? 'bookings.list.woodlandsToJb' : 'bookings.list.jbToWoodlands', { locale: $lang })}</Select.Item>
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
                        <Select.Item value={t}>{formatClockTime(t, $lang)}</Select.Item>
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
                <Card.Header>
                    <Card.Title>{$_('stats.summary.title', { locale: $lang })}</Card.Title>
                </Card.Header>
                <Card.Content>
                    <div class="flex gap-8 flex-wrap">
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

            <!-- the three breakdown tables -->
            {#each tables as t (t.title)}
                <Card.Root>
                    <Card.Header>
                        <Card.Title>{t.title}</Card.Title>
                    </Card.Header>
                    <Card.Content>
                        {#if t.rows.length === 0}
                            <p class="text-sm text-muted-foreground">{$_('stats.empty', { locale: $lang })}</p>
                        {:else}
                            <div class="overflow-x-auto">
                                <Table.Root>
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.Head>{$_('stats.table.group', { locale: $lang })}</Table.Head>
                                            <Table.Head class="text-right">{$_('stats.table.total', { locale: $lang })}</Table.Head>
                                            <Table.Head class="text-right">{$_('stats.table.completed', { locale: $lang })}</Table.Head>
                                            <Table.Head class="text-right">{$_('stats.table.failed', { locale: $lang })}</Table.Head>
                                            <Table.Head>{$_('stats.table.rate', { locale: $lang })}</Table.Head>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {#each t.rows as r (r.key)}
                                            <Table.Row>
                                                <Table.Cell class="font-medium whitespace-nowrap">{r.label}</Table.Cell>
                                                <Table.Cell class="text-right">{formatNumber(r.total, $lang)}</Table.Cell>
                                                <Table.Cell class="text-right">{formatNumber(r.completed, $lang)}</Table.Cell>
                                                <Table.Cell class="text-right">{formatNumber(r.failed, $lang)}</Table.Cell>
                                                <Table.Cell>
                                                    <div class="flex items-center gap-2">
                                                        <span class="w-14 text-right font-medium {rateClass(r.rate)}">{rateText(r.rate)}</span>
                                                        <div class="h-1.5 w-24 rounded bg-muted overflow-hidden">
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
        {/if}
    </div>
</div>
