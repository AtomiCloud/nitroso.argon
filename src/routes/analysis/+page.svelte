<script lang="ts">
    import {onMount, tick} from "svelte";
    import {page} from "$app/stores";
    import {goto} from "$app/navigation";
    import {api} from "../../store";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";

    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";

    import {Calendar} from "$lib/components/ui/calendar";
    import {Button} from "$lib/components/ui/button";
    import {cn} from "$lib/utils";
    import {CalendarDate, type DateValue, getLocalTimeZone} from "@internationalized/date";
    import {calendarDateForDisplay, parseZincDate, singaporeToday} from "$lib/time/singapore";
    import {CalendarIcon, LucideLoader, RotateCw} from "lucide-svelte";
    import type {BookingAnalysisRes, CapturedPaymentRes} from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import Loader from "$lib/components/complex/loader.svelte";
    import {toast} from "svelte-sonner";
    import {_} from "svelte-i18n";
    import {lang, formatCalendarDate, formatMoney, formatNumber, formatDateTime} from "$lib/i18n";
    import {DIRECTIONS, DIR_DOT, DIR_TINT} from "../stats/stats";
    import {shortenId} from "$lib/components/entities/Withdrawals/withdrawal";
    import {groupByDay} from "./analysis";

    // Admin-only sales/revenue analysis (server-side gated like /stats).
    // TWO calls per date range: GET Booking/analysis (per-SGT-day completed
    // tickets + gross revenue, plus the range summary) and GET
    // Payment/captured (intent-level capture evidence, newest first, ≤100).
    // Everything shown is GROSS + BunnyBooker's internal fees — Airwallex's
    // own processing fees are not stored anywhere, and the footnote says so.
    //
    // Deliberately simpler than /stats (no milestones, no tabs, no client
    // filters): one range picker, summary cards, the per-day table grouped
    // client-side (see ./analysis.ts), and the captured-payments evidence
    // list. The range is URL-encoded (from/to, defaults omitted) exactly like
    // /stats so back/refresh/share reproduce the view. Direction uses the
    // same color-dot convention as /stats (one legend, no direction text in
    // rows). Mobile: rows stack/wrap — no horizontal scrolling.

    // zinc's standard API date format, dd-MM-yyyy — CalendarDate.toString()
    // is ISO and gets rejected with a 400
    function toApiDate(d: DateValue): string {
        const dd = String(d.day).padStart(2, "0");
        const mm = String(d.month).padStart(2, "0");
        return `${dd}-${mm}-${d.year}`;
    }

    function fromApiDate(s: string | null | undefined): DateValue | null {
        const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s ?? "");
        return m ? new CalendarDate(Number(m[3]), Number(m[2]), Number(m[1])) : null;
    }

    // 24h wall-clock text from zinc's HH:mm:ss
    function hhmm(t: string | null | undefined): string {
        return (t ?? "").slice(0, 5);
    }

    // default range = the last 30 days, on Singapore's calendar (completion
    // dates are SGT — a browser in another timezone must not shift the
    // window by a day around local midnight)
    const today = singaporeToday();
    let after: DateValue | undefined = today.subtract({days: 30});
    let before: DateValue | undefined = today;

    let analysis: BookingAnalysisRes | null = null;
    let captured: CapturedPaymentRes[] = [];
    let loading = false;
    let failed = false;

    async function load() {
        loading = true;
        const range = {
            ...(after == null ? {} : {After: toApiDate(after)}),
            ...(before == null ? {} : {Before: toApiDate(before)}),
        };
        const a = await toResult(() => $api.vBookingAnalysisDetail("1", range),
            $_('analysis.loadError', {locale: $lang})).match({
            ok: (r: BookingAnalysisRes) => r,
            err: (e): BookingAnalysisRes | null => {
                console.error(e);
                return null;
            }
        });
        // capture evidence is secondary — its failure degrades to an empty
        // list with a toast rather than blanking the whole page
        const c = await toResult(() => $api.vPaymentCapturedDetail("1", {...range, Limit: 100}),
            $_('analysis.captured.loadError', {locale: $lang})).match({
            ok: (r: CapturedPaymentRes[]) => r,
            err: (e): CapturedPaymentRes[] => {
                console.error(e);
                if (a != null) toast.error($_('analysis.captured.loadError', {locale: $lang}));
                return [];
            }
        });
        analysis = a;
        captured = c;
        failed = a == null;
        loading = false;
    }

    async function rangeChange() {
        await tick();
        load();
    }

    $: dayGroups = groupByDay(analysis?.rows ?? []);
    $: summary = analysis?.summary;

    async function copyId(id: string) {
        try {
            await navigator.clipboard.writeText(id);
            toast.info($_('analysis.captured.copied', {locale: $lang}));
        } catch (e) {
            console.error(e);
        }
    }

    // ---- URL-encoded range (from/to in dd-MM-yyyy, defaults omitted) ----
    // Same pattern as /stats: no URL writes until the initial seed is done;
    // range changes replace the current history entry; browser back/forward
    // re-seed the state and refetch when the range actually moved.
    const defAfterStr = toApiDate(after);
    const defBeforeStr = toApiDate(before);
    let urlReady = false;

    // dd-MM-yyyy from the URL, validated by round-tripping through the real
    // calendar (CalendarDate is lenient — 31-02 silently constructs)
    function urlDate(s: string | null): DateValue | null {
        const d = fromApiDate(s);
        if (d == null || d.month < 1 || d.month > 12 || d.day < 1) return null;
        const normalized = new CalendarDate(d.year, d.month, 1).add({days: d.day - 1});
        return normalized.compare(d) === 0 && normalized.day === d.day ? d : null;
    }

    function applyUrl(q: URLSearchParams) {
        after = urlDate(q.get("from")) ?? fromApiDate(defAfterStr) ?? undefined;
        before = urlDate(q.get("to")) ?? fromApiDate(defBeforeStr) ?? undefined;
    }

    function serializeUrl(): string {
        const q = new URLSearchParams();
        const a = after == null ? "" : toApiDate(after);
        const b = before == null ? "" : toApiDate(before);
        if (a && a !== defAfterStr) q.set("from", a);
        if (b && b !== defBeforeStr) q.set("to", b);
        return q.toString();
    }

    function syncUrl(..._deps: unknown[]) {
        const search = serializeUrl();
        if (search === $page.url.searchParams.toString()) return;
        goto(`${$page.url.pathname}${search ? `?${search}` : ""}`,
            {replaceState: true, keepFocus: true, noScroll: true});
    }

    $: if (urlReady) syncUrl(after, before);

    $: if (urlReady) onUrlChange($page.url);

    function onUrlChange(u: URL) {
        if (u.searchParams.toString() === serializeUrl()) return;
        const prevA = after == null ? "" : toApiDate(after);
        const prevB = before == null ? "" : toApiDate(before);
        applyUrl(u.searchParams);
        const nextA = after == null ? "" : toApiDate(after);
        const nextB = before == null ? "" : toApiDate(before);
        if (nextA !== prevA || nextB !== prevB) load();
    }

    onMount(async () => {
        applyUrl($page.url.searchParams);
        urlReady = true;
        await load();
    });
</script>

<div class="flex flex-col">
    <div class="border-b bg-muted">
        <div class="flex justify-center sm:justify-between gap-4 flex-wrap py-8 items-center text-foreground max-w-[1200px] w-11/12 mx-auto">
            <div class="text-3xl lg:text-4xl">
                {$_('analysis.title', { locale: $lang })}
            </div>
            <Button variant="outline" disabled={loading} on:click={load}>
                {#if loading}
                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                {:else}
                    <RotateCw class="mr-2 h-4 w-4"/>
                {/if}
                {$_('analysis.reload', { locale: $lang })}
            </Button>
        </div>
    </div>
    <div class="flex flex-col gap-4 w-full px-2 sm:px-0 sm:w-11/12 max-w-[1200px] mx-auto my-4 sm:my-8">

        <!-- direction color legend (same convention as /stats) -->
        <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            {#each DIRECTIONS as d (d)}
                <span class="flex items-center gap-1.5">
                    <span class="inline-block h-2.5 w-2.5 rounded-full {DIR_DOT[d]}"></span>
                    <span class="text-muted-foreground">{$_(d === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang })}</span>
                </span>
            {/each}
        </div>

        <!-- completion-date range (the only control; default last 30 days) -->
        <div class="-mx-2 px-2 py-2 sm:mx-0 sm:px-3 bg-background border-y sm:border sm:rounded-lg flex flex-wrap gap-2 items-center">
            <Popover.Root>
                <Popover.Trigger asChild let:builder>
                    <Button variant="outline"
                            class={cn("h-8 px-2 text-xs justify-start font-normal shrink-0", !after && "text-muted-foreground")}
                            builders={[builder]}>
                        <CalendarIcon class="mr-1.5 h-3.5 w-3.5"/>
                        {after ? formatCalendarDate(after.toDate(getLocalTimeZone()), $lang, {day: "numeric", month: "short", year: "2-digit"}) : $_('analysis.range.after', { locale: $lang })}
                    </Button>
                </Popover.Trigger>
                <Popover.Content class="w-auto p-0" align="start">
                    <Calendar bind:value={after} onValueChange={rangeChange}/>
                </Popover.Content>
            </Popover.Root>
            <span class="text-muted-foreground text-xs">→</span>
            <Popover.Root>
                <Popover.Trigger asChild let:builder>
                    <Button variant="outline"
                            class={cn("h-8 px-2 text-xs justify-start font-normal shrink-0", !before && "text-muted-foreground")}
                            builders={[builder]}>
                        <CalendarIcon class="mr-1.5 h-3.5 w-3.5"/>
                        {before ? formatCalendarDate(before.toDate(getLocalTimeZone()), $lang, {day: "numeric", month: "short", year: "2-digit"}) : $_('analysis.range.before', { locale: $lang })}
                    </Button>
                </Popover.Trigger>
                <Popover.Content class="w-auto p-0" align="start">
                    <Calendar bind:value={before} onValueChange={rangeChange}/>
                </Popover.Content>
            </Popover.Root>
            <span class="text-xs text-muted-foreground">{$_('analysis.range.hint', { locale: $lang })}</span>
        </div>

        {#if failed}
            <div class="flex flex-col items-center gap-4 py-12">
                <p class="text-muted-foreground">{$_('analysis.loadError', { locale: $lang })}</p>
                <Button variant="outline" disabled={loading} on:click={load}>
                    <RotateCw class="mr-2 h-4 w-4"/>
                    {$_('analysis.reload', { locale: $lang })}
                </Button>
            </div>
        {:else if loading && analysis == null}
            <Loader/>
        {:else if summary != null}

            <!-- summary cards: tickets, gross, deposits, internal fees -->
            <div class="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <Card.Root>
                    <Card.Content class="p-4 flex flex-col gap-1">
                        <span class="text-sm text-muted-foreground">{$_('analysis.summary.totalTickets', { locale: $lang })}</span>
                        <span class="text-2xl font-semibold">{formatNumber(summary.totalTickets, $lang)}</span>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Content class="p-4 flex flex-col gap-1">
                        <span class="text-sm text-muted-foreground">{$_('analysis.summary.totalGross', { locale: $lang })}</span>
                        <span class="text-2xl font-semibold">{formatMoney(summary.totalGross, $lang)}</span>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Content class="p-4 flex flex-col gap-1">
                        <span class="text-sm text-muted-foreground">{$_('analysis.summary.deposits', { locale: $lang })}</span>
                        <span class="text-2xl font-semibold">{formatMoney(summary.deposits.captured, $lang)}</span>
                        <span class="text-xs text-muted-foreground">{$_('analysis.summary.depositsCount', { locale: $lang, values: { count: formatNumber(summary.deposits.count, $lang) } })}</span>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Content class="p-4 flex flex-col gap-1">
                        <span class="text-sm text-muted-foreground">{$_('analysis.summary.internalFees', { locale: $lang })}</span>
                        <div class="grid grid-cols-2 gap-x-3 text-sm tabular-nums">
                            <span class="text-muted-foreground">{$_('analysis.summary.feeDeposit', { locale: $lang })}</span>
                            <span class="text-right">{formatMoney(summary.internalFees.deposit, $lang)}</span>
                            <span class="text-muted-foreground">{$_('analysis.summary.feeWithdrawal', { locale: $lang })}</span>
                            <span class="text-right">{formatMoney(summary.internalFees.withdrawal, $lang)}</span>
                            <span class="text-muted-foreground">{$_('analysis.summary.feePriority', { locale: $lang })}</span>
                            <span class="text-right">{formatMoney(summary.internalFees.priority, $lang)}</span>
                            <span class="text-muted-foreground">{$_('analysis.summary.feeTermination', { locale: $lang })}</span>
                            <span class="text-right">{formatMoney(summary.internalFees.termination, $lang)}</span>
                        </div>
                    </Card.Content>
                </Card.Root>
            </div>
            <p class="text-xs text-muted-foreground">{$_('analysis.grossNote', { locale: $lang })}</p>

            <!-- daily breakdown: per-day totals with the direction × time
                 slot rows grouped beneath (stacked rows — no horizontal
                 scroll on phones) -->
            <Card.Root>
                <Card.Header class="p-4 sm:p-6">
                    <Card.Title>{$_('analysis.daily.title', { locale: $lang })}</Card.Title>
                    <Card.Description>{$_('analysis.daily.description', { locale: $lang })}</Card.Description>
                </Card.Header>
                <Card.Content class="px-4 sm:px-6">
                    {#if dayGroups.length === 0}
                        <p class="text-sm text-muted-foreground">{$_('analysis.empty', { locale: $lang })}</p>
                    {:else}
                        <div class="flex flex-col divide-y">
                            {#each dayGroups as g (g.date)}
                                <div class="py-3 flex flex-col gap-1.5">
                                    <div class="flex items-baseline justify-between gap-3">
                                        <span class="font-semibold">{formatCalendarDate(calendarDateForDisplay(parseZincDate(g.date)), $lang, {weekday: "short", day: "numeric", month: "short", year: "numeric"})}</span>
                                        <span class="flex items-baseline gap-3 shrink-0 tabular-nums">
                                            <span class="text-sm text-muted-foreground">{$_('analysis.daily.tickets', { locale: $lang, values: { count: formatNumber(g.tickets, $lang) } })}</span>
                                            <span class="font-semibold">{formatMoney(g.gross, $lang)}</span>
                                        </span>
                                    </div>
                                    <div class="flex flex-col gap-0.5">
                                        {#each g.slots as s (`${s.time}|${s.direction}`)}
                                            <div class="flex items-center justify-between gap-3 rounded px-2 py-1 {DIR_TINT[s.direction] ?? ''}">
                                                <span class="flex items-center gap-2 text-sm">
                                                    <span class="inline-block h-2 w-2 rounded-full {DIR_DOT[s.direction] ?? 'bg-muted-foreground'}"></span>
                                                    {hhmm(s.time)}
                                                </span>
                                                <span class="flex items-baseline gap-3 shrink-0 tabular-nums text-sm">
                                                    <span class="text-muted-foreground">{$_('analysis.daily.tickets', { locale: $lang, values: { count: formatNumber(s.tickets, $lang) } })}</span>
                                                    <span>{formatMoney(s.gross, $lang)}</span>
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </Card.Content>
            </Card.Root>

            <!-- captured payments (deposit evidence, newest first, ≤100) -->
            <Card.Root>
                <Card.Header class="p-4 sm:p-6">
                    <Card.Title>{$_('analysis.captured.title', { locale: $lang })}</Card.Title>
                    <Card.Description>{$_('analysis.captured.description', { locale: $lang })}</Card.Description>
                </Card.Header>
                <Card.Content class="px-4 sm:px-6">
                    {#if captured.length === 0}
                        <p class="text-sm text-muted-foreground">{$_('analysis.captured.empty', { locale: $lang })}</p>
                    {:else}
                        <ul class="flex flex-col divide-y">
                            {#each captured as c (`${c.paymentIntentId}|${c.createdAt}`)}
                                <li class="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                                    <div class="flex flex-col gap-0.5 text-sm min-w-0">
                                        <button type="button"
                                                class="font-mono hover:underline underline-offset-4 self-start"
                                                title={c.paymentIntentId}
                                                on:click={() => copyId(c.paymentIntentId)}>
                                            {shortenId(c.paymentIntentId)}
                                        </button>
                                        <span class="text-xs text-muted-foreground">{formatDateTime(c.createdAt, $lang)}</span>
                                    </div>
                                    <div class="flex items-center gap-3 shrink-0 text-sm">
                                        <span class="font-semibold tabular-nums">{formatMoney(c.capturedAmount, $lang, {currency: c.currency || "SGD"})}</span>
                                        <span class="text-muted-foreground">{c.status}</span>
                                    </div>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </Card.Content>
            </Card.Root>
        {/if}
    </div>
</div>
