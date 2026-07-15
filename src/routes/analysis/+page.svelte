<script lang="ts">
    import {onMount, tick} from "svelte";
    import {page} from "$app/stores";
    import {goto} from "$app/navigation";
    import {api} from "../../store";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";

    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";

    //@ts-ignore
    import * as Select from "$lib/components/ui/select";

    //@ts-ignore
    import * as Table from "$lib/components/ui/table";

    //@ts-ignore
    import * as Tabs from "$lib/components/ui/tabs";

    import {Calendar} from "$lib/components/ui/calendar";
    import {Button} from "$lib/components/ui/button";
    import {Badge} from "$lib/components/ui/badge";
    import {cn} from "$lib/utils";
    import type {Selected} from "bits-ui";
    import {CalendarDate, type DateValue, getLocalTimeZone} from "@internationalized/date";
    import {calendarDateForDisplay, parseZincDate, singaporeToday} from "$lib/time/singapore";
    import {ArrowLeftRight, CalendarIcon, ChevronLeft, ChevronRight, LucideLoader, RefreshCcw, RotateCw} from "lucide-svelte";
    import type {
        BookingAnalysisRes,
        BookingBoostRes,
        CapturedPaymentRes,
        MonthlyAnalysisRes,
    } from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import Loader from "$lib/components/complex/loader.svelte";
    import InfoTip from "$lib/components/core/InfoTip.svelte";
    import HistoryGateNote from "$lib/components/complex/HistoryGateNote.svelte";
    import {toast} from "svelte-sonner";
    import {_} from "svelte-i18n";
    import {lang, formatCalendarDate, formatMoney, formatNumber, formatDateTime} from "$lib/i18n";
    import {DIRECTIONS, DIR_DOT, DIR_TINT} from "../stats/stats";
    import {shortenId} from "$lib/components/entities/Withdrawals/withdrawal";
    import KtmbFxSection from "$lib/components/entities/Costs/KtmbFxSection.svelte";
    import {
        ANALYSIS_TABS,
        PROFIT_QUARTERS,
        boostView,
        cellCostIncomplete,
        cellNet,
        cellProfit,
        daysPresent,
        dayProfitNet,
        groupByDay,
        joinMonthlyWithdrawalCost,
        monthNet,
        pickParam,
        pivotProfitBuckets,
        rangeNet,
        sortMonthly,
        urlDayParam,
    } from "./analysis";
    import {
        blendedLossPct,
        pnlWithdrawalBreakdown,
        terminalZeroFill,
        withdrawalLossAmount,
        withdrawalTotals,
        type TerminalPnlRow,
    } from "$lib/pnl/terminal";

    // Admin-only sales/revenue analytics (server-side gated like /stats).
    // Zinc PR #39 turned GET Booking/analysis into the full P&L source: rows
    // now carry the effective-dated KTMB cost, the summary carries synced
    // Airwallex gateway fees + a per-direction split, and the response adds a
    // monthly rollup (net = gross − ktmb − gateway fees) plus a ranking of
    // pricing components over the persisted purchase breakdowns.
    //
    // The page is TABS over shared state, mirroring /stats' architecture:
    //   Overview  summary cards + direction split + component ranking
    //   Monthly   the monthly P&L table + the gateway-fee sync button
    //   By day    a day selector → that day's direction × time breakdown
    //   Boosts    the paginated boost ledger (admin grants highlighted)
    //   Payments  the captured-payments evidence list (moved from the old
    //             single-page layout)
    // The active tab and every global filter are mirrored into the URL query
    // string (tab/from/to/dir/day, defaults omitted; tab switches PUSH
    // history, filter changes replace) so back / refresh / share reproduce
    // the exact view. Mobile: everything wraps — no horizontal scrolling
    // outside tables.

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
    let profitRows: ReturnType<typeof pivotProfitBuckets> = [];
    let profitLoading = false;
    let profitFailed = false;
    let loading = false;
    let failed = false;

    function rangeQuery() {
        return {
            ...(after == null ? {} : {After: toApiDate(after)}),
            ...(before == null ? {} : {Before: toApiDate(before)}),
        };
    }

    // race guard (same pattern as /pnl): rapid range changes put several
    // load()s in flight; only the latest may write, or an older range's
    // slower response repaints the page under the newer pickers
    let loadToken = 0;

    async function load() {
        const myToken = ++loadToken;
        loading = true;
        const range = rangeQuery();
        const a = await toResult(() => $api.vBookingAnalysisDetail("1", range),
            $_('analysis.loadError', {locale: $lang})).match({
            ok: (r: BookingAnalysisRes) => r,
            err: (e): BookingAnalysisRes | null => {
                console.error(e);
                return null;
            }
        });
        if (myToken !== loadToken) return;
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
        if (myToken !== loadToken) return;
        analysis = a;
        captured = c;
        failed = a == null;
        loading = false;
        // the boost ledger follows the same range; a new range restarts its
        // pagination from the first page
        boostSkip = 0;
        loadBoosts();
        // the profit-by-travel-day grid fetches independently — it groups
        // by travel date (NOT completion date), so it tolerates its own
        // failure without blanking the page above
        loadProfit();
        // the withdrawals tab fetches the same terminal endpoint /pnl uses
        // and tolerates its own failure — admin can still see the other tabs
        loadWithdrawals();
    }

    // ---- Withdrawals tab: reuses the terminal endpoint /pnl uses so the
    // withdrawal breakdown stays consistent across both pages. Race-guarded
    // like loadProfit / loadBoosts so rapid range changes can't clobber a
    // newer response. ----
    let withdrawalRaw: TerminalPnlRow[] | null = null;
    let withdrawalsLoading = false;
    let withdrawalsFailed = false;
    let withdrawalToken = 0;

    async function loadWithdrawals() {
        const myToken = ++withdrawalToken;
        withdrawalsLoading = true;
        withdrawalsFailed = false;
        await toResult(() => $api.vBookingPnlTerminalDetail("1", rangeQuery()),
            $_('analysis.withdrawals.loadError', {locale: $lang})).match({
            ok: (r) => {
                if (myToken !== withdrawalToken) return;
                withdrawalRaw = terminalZeroFill(r, bounds.from, bounds.to);
                withdrawalsFailed = false;
            },
            err: (e) => {
                if (myToken !== withdrawalToken) return;
                console.error(e);
                withdrawalsFailed = true;
                // the Monthly + Overview tabs degrade this fetch to an em-dash;
                // toast once (only when the primary analysis loaded) so the
                // admin knows the withdrawal cost is unavailable
                if (analysis != null) toast.error($_('analysis.withdrawals.loadError', {locale: $lang}));
            }
        });
        if (myToken === withdrawalToken) withdrawalsLoading = false;
    }

    let profitToken = 0;

    async function loadProfit() {
        const myToken = ++profitToken;
        profitLoading = true;
        profitFailed = false;
        await toResult(() => $api.vBookingAnalysisProfitDetail("1", rangeQuery()),
            $_('analysis.profit.loadError', {locale: $lang})).match({
            ok: (r) => {
                if (myToken !== profitToken) return;
                profitRows = pivotProfitBuckets(r);
                profitFailed = false;
            },
            err: (e) => {
                if (myToken !== profitToken) return;
                console.error(e);
                profitFailed = true;
            }
        });
        if (myToken === profitToken) profitLoading = false;
    }

    async function rangeChange() {
        await tick();
        load();
    }

    // ---- the boost ledger (own endpoint, paginated; failure degrades to an
    // inline error on the Boosts tab, never the whole page) ----
    const BOOST_LIMIT = 50;
    let boosts: BookingBoostRes[] = [];
    let boostTotal = 0;
    let boostSkip = 0;
    let boostsLoading = false;
    let boostsFailed = false;

    let boostToken = 0;

    async function loadBoosts() {
        const myToken = ++boostToken;
        boostsLoading = true;
        boostsFailed = false;
        await toResult(() => $api.vBookingAnalysisBoostsDetail("1", {
            ...rangeQuery(),
            Limit: BOOST_LIMIT,
            Skip: boostSkip,
        }), $_('analysis.boosts.loadError', {locale: $lang})).match({
            ok: (r) => {
                if (myToken !== boostToken) return;
                boosts = r.items;
                boostTotal = r.total;
            },
            err: (e) => {
                if (myToken !== boostToken) return;
                console.error(e);
                boostsFailed = true;
            }
        });
        if (myToken === boostToken) boostsLoading = false;
    }

    function boostPage(delta: number) {
        const next = boostSkip + delta * BOOST_LIMIT;
        if (next < 0 || next >= boostTotal) return;
        boostSkip = next;
        loadBoosts();
    }

    // the global direction filter narrows the CURRENT page client-side (zinc
    // has no direction param on the boosts endpoint); the pager still walks
    // the unfiltered ledger, so the count line stays the server's truth
    $: visibleBoosts = boosts.filter(b => dir === "" || b.direction === dir);

    // ---- gateway-fee sync (Monthly tab; fees post with delay on Airwallex's
    // side, so "missing" intents are expected to resolve on a later run) ----
    let syncing = false;

    async function syncGatewayFees() {
        syncing = true;
        await toResult(() => $api.vPaymentGatewayFeesSyncCreate("1", rangeQuery()),
            $_('analysis.monthly.syncError', {locale: $lang})).match({
            ok: (r) => {
                toast.info($_('analysis.monthly.syncSuccess', {
                    locale: $lang,
                    values: {synced: r.synced, missing: r.missing.length},
                }));
                if (r.hasMore) toast.info($_('analysis.monthly.syncHasMore', {locale: $lang}));
                // the synced fees change the summary/monthly numbers
                load();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        });
        syncing = false;
    }

    // ---- global direction filter (client-side; zinc's analysis endpoint has
    // no direction param). It narrows everything that CARRIES a direction:
    // the direction split tables, the monthly per-direction sub-rows, the
    // by-day breakdown and the boost rows. Range-wide figures that zinc does
    // not attribute per direction (deposits, internal/gateway fees, the
    // summary cards) stay untouched. ----
    let selDirection: Selected<string> | undefined;

    // keep the closed-trigger label in the active locale (same treatment as
    // the /stats selects)
    $: if (selDirection?.value) {
        const l = $_(selDirection.value === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', {locale: $lang});
        if (selDirection.label !== l) selDirection = {...selDirection, label: l};
    }

    $: dir = selDirection?.value ?? "";

    $: summary = analysis?.summary;
    $: dirRows = (analysis?.rows ?? []).filter(r => dir === "" || r.direction === dir);
    $: byDirection = (summary?.byDirection ?? []).filter(d => dir === "" || d.direction === dir);
    $: components = analysis?.components ?? [];
    $: coverage = analysis?.componentsCoverage;
    $: monthly = sortMonthly(analysis?.monthly ?? []);

    // the withdrawals tab fetches the terminal endpoint and zero-fills
    // across the picked range like /pnl does. bounds fall back to "" when
    // the picker has not seeded a date yet — terminalZeroFill passes those
    // straight through with an ascending sort
    $: bounds = {
        from: after == null ? "" : `${String(after.month).padStart(2, "0")}-${after.year}`,
        to: before == null ? "" : `${String(before.month).padStart(2, "0")}-${before.year}`,
    };

    // withdrawal cost for the Monthly tab columns + the Overview card, fed by
    // the same terminal fetch as the Withdrawals tab. null when the fetch
    // failed (or hasn't completed) so the renderer shows an em-dash, never a
    // misleading 0. withdrawalRaw is already zero-filled across the range.
    $: wdCostByMonth = withdrawalRaw != null && !withdrawalsFailed
        ? joinMonthlyWithdrawalCost(withdrawalRaw)
        : null;
    $: wdRangeLoss = withdrawalRaw != null && !withdrawalsFailed
        ? withdrawalTotals(withdrawalRaw).netLoss
        : null;

    // component ranking: biggest earner at the top, biggest loser at the
    // bottom — the "what makes/loses money" reading order
    $: rankedComponents = [...components].sort((a, b) => b.totalDelta - a.totalDelta);

    const KIND_CLASS: Record<string, string> = {
        policy: "text-green-600 dark:text-green-400",
        discount: "text-red-600 dark:text-red-400",
        priorityFee: "",
    };

    function deltaClass(delta: number): string {
        if (delta > 0) return "text-green-600 dark:text-green-400";
        if (delta < 0) return "text-red-600 dark:text-red-400";
        return "";
    }

    function signedMoney(delta: number): string {
        const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
        return `${sign}${formatMoney(Math.abs(delta), $lang)}`;
    }

    function kindLabel(kind: string): string {
        return ["policy", "discount", "priorityFee"].includes(kind)
            ? $_(`analysis.components.kind.${kind}`, {locale: $lang})
            : kind;
    }

    function monthLabel(month: string): string {
        // zinc's MM-yyyy → a localized "Jul 2026"
        const m = /^(\d{2})-(\d{4})$/.exec(month);
        if (m == null) return month;
        return formatCalendarDate(new Date(Number(m[2]), Number(m[1]) - 1, 1), $lang, {month: "short", year: "numeric"});
    }

    function monthDirections(m: MonthlyAnalysisRes) {
        return m.byDirection.filter(d => dir === "" || d.direction === dir);
    }

    // ---- by-day tab: one day at a time (a Select + prev/next arrows over
    // the days present, NOT a giant wall of tables) ----
    // "" = auto: the newest day in range. A URL-seeded day that is absent
    // from the loaded rows falls back to auto without being cleared, so a
    // shared link survives the fetch racing the seed.
    let day = "";
    let selDaySel: Selected<string> | undefined;

    $: days = daysPresent(dirRows);
    $: effectiveDay = day !== "" && days.includes(day) ? day : (days[0] ?? "");
    $: dayGroup = groupByDay(dirRows.filter(r => r.date === effectiveDay))[0] ?? null;

    function dayLabel(d: string): string {
        return d === "" ? "" : formatCalendarDate(calendarDateForDisplay(parseZincDate(d)), $lang,
            {weekday: "short", day: "numeric", month: "short", year: "numeric"});
    }

    // localized date label for travel-date rows (no weekday — the grid is
    // already one row per travel date)
    function travelDateLabel(ddMMyyyy: string): string {
        const parsed = parseZincDate(ddMMyyyy);
        if (parsed == null) return ddMMyyyy;
        return formatCalendarDate(calendarDateForDisplay(parsed), $lang,
            {day: "numeric", month: "short", year: "numeric"});
    }

    // the Select mirrors effectiveDay; picking writes the explicit day
    $: selDaySel = effectiveDay === "" ? undefined : {value: effectiveDay, label: dayLabel(effectiveDay)};

    function dayPick(s: Selected<string> | undefined) {
        if (s?.value) day = s.value;
    }

    // days[] is newest first: "next" walks toward newer, "prev" toward older
    function dayStep(delta: number) {
        const i = days.indexOf(effectiveDay);
        if (i === -1) return;
        const next = i - delta;
        if (next < 0 || next >= days.length) return;
        day = days[next];
    }

    async function copyId(id: string) {
        try {
            await navigator.clipboard.writeText(id);
            toast.info($_('analysis.captured.copied', {locale: $lang}));
        } catch (e) {
            console.error(e);
        }
    }

    // ---- tabs over the shared state ----
    let tab = "overview";

    // ---- URL-encoded view state ----
    // Same pattern as /stats (applyUrl/serializeUrl/syncUrl with loop
    // guards): tab/from/to/dir/day mirrored into the query string, defaults
    // omitted; tab switches PUSH history entries (browser Back walks the tab
    // trail), filter changes replace the current entry; browser back/forward
    // re-seed the state and refetch only when the range actually moved.
    const defAfterStr = toApiDate(after);
    const defBeforeStr = toApiDate(before);
    let urlReady = false;
    let lastTab = tab;

    // dd-MM-yyyy from the URL, validated by round-tripping through the real
    // calendar (CalendarDate is lenient — 31-02 silently constructs)
    function urlDate(s: string | null): DateValue | null {
        const d = fromApiDate(s);
        if (d == null || d.month < 1 || d.month > 12 || d.day < 1) return null;
        const normalized = new CalendarDate(d.year, d.month, 1).add({days: d.day - 1});
        return normalized.compare(d) === 0 && normalized.day === d.day ? d : null;
    }

    function selOf(v: string): Selected<string> | undefined {
        return v === "" ? undefined : {value: v, label: v};
    }

    function applyUrl(q: URLSearchParams) {
        tab = pickParam(q.get("tab"), ANALYSIS_TABS) || "overview";
        lastTab = tab;
        after = urlDate(q.get("from")) ?? fromApiDate(defAfterStr) ?? undefined;
        before = urlDate(q.get("to")) ?? fromApiDate(defBeforeStr) ?? undefined;
        selDirection = selOf(pickParam(q.get("dir"), DIRECTIONS));
        day = urlDayParam(q.get("day"));
    }

    function serializeUrl(): string {
        const q = new URLSearchParams();
        if (tab !== "overview") q.set("tab", tab);
        const a = after == null ? "" : toApiDate(after);
        const b = before == null ? "" : toApiDate(before);
        if (a && a !== defAfterStr) q.set("from", a);
        if (b && b !== defBeforeStr) q.set("to", b);
        if (selDirection?.value) q.set("dir", selDirection.value);
        if (day !== "") q.set("day", day);
        return q.toString();
    }

    $: if (urlReady) syncUrl(tab, after, before, selDirection, day);

    function syncUrl(..._deps: unknown[]) {
        const search = serializeUrl();
        const push = tab !== lastTab;
        lastTab = tab;
        if (search === $page.url.searchParams.toString()) return;
        goto(`${$page.url.pathname}${search ? `?${search}` : ""}`,
            {replaceState: !push, keepFocus: true, noScroll: true});
    }

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

        <!-- GLOBAL filter bar: completion-date range (refetches) + direction
             (client-side) + the day selector when the By-day tab is active.
             Everything WRAPS — no horizontal scrolling. -->
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
            <Select.Root bind:selected={selDirection}>
                <Select.Trigger class="h-8 w-40 text-xs shrink-0">
                    <ArrowLeftRight class="mr-1.5 h-3.5 w-3.5 shrink-0"/>
                    <Select.Value placeholder={$_('analysis.filters.direction', { locale: $lang })}/>
                </Select.Trigger>
                <Select.Content>
                    <Select.Item value="">{$_('analysis.filters.all', { locale: $lang })}</Select.Item>
                    {#each DIRECTIONS as d}
                        <Select.Item value={d}>
                            <span class="inline-block h-2 w-2 rounded-full mr-2 {DIR_DOT[d]}"></span>
                            {$_(d === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang })}
                        </Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
            {#if tab === "byday" && days.length > 0}
                <span class="flex items-center gap-1">
                    <Button variant="outline" size="icon" class="h-8 w-8 shrink-0"
                            aria-label={$_('analysis.byDay.prevDay', { locale: $lang })}
                            disabled={days.indexOf(effectiveDay) >= days.length - 1}
                            on:click={() => dayStep(-1)}>
                        <ChevronLeft class="h-4 w-4"/>
                    </Button>
                    <Select.Root selected={selDaySel} onSelectedChange={dayPick}>
                        <Select.Trigger class="h-8 w-48 text-xs shrink-0">
                            <CalendarIcon class="mr-1.5 h-3.5 w-3.5 shrink-0"/>
                            <Select.Value placeholder={$_('analysis.byDay.day', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content class="max-h-72 overflow-y-auto">
                            {#each days as d (d)}
                                <Select.Item value={d}>{dayLabel(d)}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                    <Button variant="outline" size="icon" class="h-8 w-8 shrink-0"
                            aria-label={$_('analysis.byDay.nextDay', { locale: $lang })}
                            disabled={days.indexOf(effectiveDay) <= 0}
                            on:click={() => dayStep(1)}>
                        <ChevronRight class="h-4 w-4"/>
                    </Button>
                </span>
            {/if}
            <span class="text-xs text-muted-foreground">{$_('analysis.range.hint', { locale: $lang })}</span>
        </div>
        <HistoryGateNote from={after} />

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
            <Tabs.Root bind:value={tab}>
                <div class="overflow-x-auto">
                    <Tabs.List class="w-max h-9">
                        <Tabs.Trigger value="overview" class="text-xs sm:text-sm px-2.5">{$_('analysis.tabs.overview', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="monthly" class="text-xs sm:text-sm px-2.5">{$_('analysis.tabs.monthly', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="byday" class="text-xs sm:text-sm px-2.5">{$_('analysis.tabs.byDay', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="profit" class="text-xs sm:text-sm px-2.5">{$_('analysis.tabs.profit', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="boosts" class="text-xs sm:text-sm px-2.5">{$_('analysis.tabs.boosts', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="payments" class="text-xs sm:text-sm px-2.5">{$_('analysis.tabs.payments', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="withdrawals" class="text-xs sm:text-sm px-2.5">{$_('analysis.tabs.withdrawals', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="costs" class="text-xs sm:text-sm px-2.5">{$_('analysis.tabs.costs', { locale: $lang })}</Tabs.Trigger>
                    </Tabs.List>
                </div>

                <!-- 1. Overview: the range P&L at a glance + the direction
                     split + the component ranking -->
                <Tabs.Content value="overview" class="flex flex-col gap-4">
                    <div class="grid gap-3 grid-cols-2 lg:grid-cols-3">
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
                                <span class="text-sm text-muted-foreground">{$_('analysis.summary.ktmbCost', { locale: $lang })}</span>
                                <span class="text-2xl font-semibold">{formatMoney(summary.totalKtmbCost ?? 0, $lang)}</span>
                                {#if summary.ktmbActualCoverage != null}
                                    <span class="text-xs text-muted-foreground">
                                        {$_('analysis.summary.actualCoverage', { locale: $lang, values: {
                                            n: formatNumber(summary.ktmbActualCoverage.withActual, $lang),
                                            m: formatNumber(summary.ktmbActualCoverage.total, $lang),
                                        } })}
                                    </span>
                                {/if}
                            </Card.Content>
                        </Card.Root>
                        <Card.Root>
                            <Card.Content class="p-4 flex flex-col gap-1">
                                <span class="text-sm text-muted-foreground">{$_('analysis.summary.gatewayFees', { locale: $lang })}</span>
                                <div class="grid grid-cols-2 gap-x-3 text-sm tabular-nums">
                                    <span class="text-muted-foreground">{$_('analysis.summary.gwPayments', { locale: $lang })}</span>
                                    <span class="text-right">{formatMoney(summary.gatewayFees?.payments ?? 0, $lang)}</span>
                                    <span class="text-muted-foreground">{$_('analysis.summary.gwPayouts', { locale: $lang })}</span>
                                    <span class="text-right">{formatMoney(summary.gatewayFees?.payouts ?? 0, $lang)}</span>
                                </div>
                                {#if summary.gatewayFees != null}
                                    <span class="text-xs text-muted-foreground">
                                        {$_('analysis.summary.coverage', { locale: $lang, values: {
                                            withFee: formatNumber(summary.gatewayFees.coverage.paymentsWithFee, $lang),
                                            total: formatNumber(summary.gatewayFees.coverage.paymentsTotal, $lang),
                                        } })}
                                    </span>
                                {/if}
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
                        <Card.Root>
                            <Card.Content class="p-4 flex flex-col gap-1">
                                <span class="text-sm text-muted-foreground">{$_('analysis.summary.net', { locale: $lang })}</span>
                                <span class="text-2xl font-bold {deltaClass(rangeNet(summary))}">{formatMoney(rangeNet(summary), $lang)}</span>
                                <span class="text-xs text-muted-foreground">{$_('analysis.summary.netHint', { locale: $lang })}</span>
                            </Card.Content>
                        </Card.Root>
                        <!-- withdrawal net cost: range total of the terminal-event
                             loss, same fetch as the Withdrawals tab. Em-dash when
                             the terminal fetch failed so the card never lies -->
                        <Card.Root>
                            <Card.Content class="p-4 flex flex-col gap-1">
                                <span class="text-sm text-muted-foreground">{$_('analysis.overview.wdCostTitle', { locale: $lang })}</span>
                                <!-- wdRangeLoss is LOSS-signed (positive = losing money);
                                     deltaClass colors positive green, so negate -->
                                <span class="text-2xl font-bold {wdRangeLoss == null ? '' : deltaClass(-wdRangeLoss)}">
                                    {wdRangeLoss == null ? $_('analysis.overview.wdCostDash', { locale: $lang }) : formatMoney(wdRangeLoss, $lang)}
                                </span>
                                <span class="text-xs text-muted-foreground">{$_('analysis.overview.wdCostHint', { locale: $lang })}</span>
                            </Card.Content>
                        </Card.Root>
                    </div>
                    <p class="text-xs text-muted-foreground">{$_('analysis.grossNote', { locale: $lang })}</p>

                    <!-- deposits (still range-wide capture evidence context) -->
                    <div class="flex flex-wrap items-baseline gap-x-2 text-sm">
                        <span class="text-muted-foreground">{$_('analysis.summary.deposits', { locale: $lang })}:</span>
                        <span class="font-semibold tabular-nums">{formatMoney(summary.deposits.captured, $lang)}</span>
                        <span class="text-xs text-muted-foreground">{$_('analysis.summary.depositsCount', { locale: $lang, values: { count: formatNumber(summary.deposits.count, $lang) } })}</span>
                    </div>

                    {#if byDirection.length > 0}
                        <Card.Root>
                            <Card.Header class="p-4 sm:p-6">
                                <Card.Title>{$_('analysis.byDirection.title', { locale: $lang })}</Card.Title>
                            </Card.Header>
                            <Card.Content class="px-2 sm:px-6">
                                <div class="overflow-x-auto">
                                    <Table.Root>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head class="h-8 px-2"></Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">{$_('analysis.byDirection.colTickets', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">{$_('analysis.byDirection.colGross', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">{$_('analysis.byDirection.colKtmb', { locale: $lang })}</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each byDirection as d (d.direction)}
                                                <Table.Row class={DIR_TINT[d.direction] ?? ''}>
                                                    <Table.Cell class="px-2 py-1.5 whitespace-nowrap">
                                                        <span class="flex items-center gap-2">
                                                            <span class="inline-block h-2 w-2 rounded-full {DIR_DOT[d.direction] ?? 'bg-muted-foreground'}"></span>
                                                            {$_(d.direction === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang })}
                                                        </span>
                                                    </Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatNumber(d.tickets, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatMoney(d.gross, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatMoney(d.ktmbCost, $lang)}</Table.Cell>
                                                </Table.Row>
                                            {/each}
                                        </Table.Body>
                                    </Table.Root>
                                </div>
                            </Card.Content>
                        </Card.Root>
                    {/if}

                    <!-- component ranking: policies (positive/green),
                         discounts (negative/red), priority fees -->
                    <Card.Root>
                        <Card.Header class="p-4 sm:p-6">
                            <Card.Title>{$_('analysis.components.title', { locale: $lang })}</Card.Title>
                            <Card.Description>{$_('analysis.components.description', { locale: $lang })}</Card.Description>
                        </Card.Header>
                        <Card.Content class="px-2 sm:px-6">
                            {#if rankedComponents.length === 0}
                                <p class="text-sm text-muted-foreground px-2">{$_('analysis.components.empty', { locale: $lang })}</p>
                            {:else}
                                <div class="overflow-x-auto">
                                    <Table.Root>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head class="h-8 px-2">{$_('analysis.components.colName', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">{$_('analysis.components.colTimes', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">{$_('analysis.components.colDelta', { locale: $lang })}</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each rankedComponents as c (`${c.kind}|${c.name}`)}
                                                <Table.Row>
                                                    <Table.Cell class="px-2 py-1.5">
                                                        <span class="flex flex-wrap items-center gap-2">
                                                            <span class="font-medium">{c.name}</span>
                                                            <Badge variant="outline" class={KIND_CLASS[c.kind] ?? ''}>{kindLabel(c.kind)}</Badge>
                                                        </span>
                                                    </Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatNumber(c.timesApplied, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-medium {deltaClass(c.totalDelta)}">{signedMoney(c.totalDelta)}</Table.Cell>
                                                </Table.Row>
                                            {/each}
                                        </Table.Body>
                                    </Table.Root>
                                </div>
                            {/if}
                            {#if coverage != null}
                                <p class="text-xs text-muted-foreground mt-3 px-2">
                                    {$_('analysis.components.coverage', { locale: $lang, values: {
                                        n: formatNumber(coverage.withBreakdown, $lang),
                                        m: formatNumber(coverage.total, $lang),
                                    } })}
                                </p>
                            {/if}
                        </Card.Content>
                    </Card.Root>
                </Tabs.Content>

                <!-- 2. Monthly P&L + the gateway-fee sync button -->
                <Tabs.Content value="monthly" class="flex flex-col gap-4">
                    <Card.Root>
                        <Card.Header class="p-4 sm:p-6">
                            <div class="flex flex-wrap justify-between items-start gap-3">
                                <div class="flex flex-col gap-1">
                                    <Card.Title>{$_('analysis.monthly.title', { locale: $lang })}</Card.Title>
                                    <Card.Description>{$_('analysis.monthly.description', { locale: $lang })}</Card.Description>
                                </div>
                                <Button variant="outline" size="sm" disabled={syncing} on:click={syncGatewayFees}>
                                    {#if syncing}
                                        <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                                    {:else}
                                        <RefreshCcw class="mr-2 h-4 w-4"/>
                                    {/if}
                                    {$_('analysis.monthly.sync', { locale: $lang })}
                                </Button>
                            </div>
                        </Card.Header>
                        <Card.Content class="px-2 sm:px-6">
                            {#if monthly.length === 0}
                                <p class="text-sm text-muted-foreground px-2">{$_('analysis.monthly.empty', { locale: $lang })}</p>
                            {:else}
                                <div class="overflow-x-auto">
                                    <Table.Root>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head class="h-8 px-2">{$_('analysis.monthly.colMonth', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">{$_('analysis.monthly.colGross', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">{$_('analysis.monthly.colKtmb', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">{$_('analysis.monthly.colAwxPayments', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">{$_('analysis.monthly.colAwxPayouts', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">
                                                    <span class="inline-flex items-center gap-1">
                                                        {$_('analysis.monthly.colInternal', { locale: $lang })}
                                                        <InfoTip label={$_('analysis.monthly.colInternal', { locale: $lang })}>
                                                            {$_('analysis.monthly.internalHint', { locale: $lang })}
                                                        </InfoTip>
                                                    </span>
                                                </Table.Head>
                                                <Table.Head class="h-8 px-2 text-right whitespace-nowrap">
                                                    <span class="inline-flex items-center gap-1">
                                                        {$_('analysis.monthly.colWdCost', { locale: $lang })}
                                                        <InfoTip label={$_('analysis.monthly.colWdCost', { locale: $lang })}>
                                                            {$_('analysis.monthly.wdCostHint', { locale: $lang })}
                                                        </InfoTip>
                                                    </span>
                                                </Table.Head>
                                                <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('analysis.monthly.colWithdrawals', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">{$_('analysis.monthly.colNet', { locale: $lang })}</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each monthly as m (m.month)}
                                                <Table.Row>
                                                    <Table.Cell class="px-2 py-1.5 font-medium whitespace-nowrap">{monthLabel(m.month)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatMoney(m.gross, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatMoney(m.ktmbCost, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatMoney(m.gatewayPaymentFees, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatMoney(m.gatewayPayoutFees, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{formatMoney(m.internalFees, $lang)}</Table.Cell>
                                                    <!-- withdrawal cost (terminal-event loss) +
                                                         the count · gross subtitle, joined by month
                                                         from the same terminal fetch as the
                                                         Withdrawals tab; em-dash on fetch failure -->
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums">
                                                        {#if wdCostByMonth == null}
                                                            {$_('analysis.monthly.wdCostDash', { locale: $lang })}
                                                        {:else}
                                                            {@const wd = wdCostByMonth.get(m.month)}
                                                            <!-- cost is LOSS-signed — negate for deltaClass -->
                                                            <span class="font-medium {deltaClass(-(wd?.cost ?? 0))}">{formatMoney(wd?.cost ?? 0, $lang)}</span>
                                                        {/if}
                                                    </Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                                                        {#if wdCostByMonth == null}
                                                            {$_('analysis.monthly.wdCostDash', { locale: $lang })}
                                                        {:else}
                                                            {@const wd = wdCostByMonth.get(m.month)}
                                                            {$_('analysis.monthly.wdCount', { locale: $lang, values: {
                                                                count: formatNumber(wd?.count ?? 0, $lang),
                                                                gross: formatMoney(wd?.gross ?? 0, $lang),
                                                            } })}
                                                        {/if}
                                                    </Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-bold {deltaClass(monthNet(m))}">{formatMoney(monthNet(m), $lang)}</Table.Cell>
                                                </Table.Row>
                                                <!-- per-direction sub-rows (muted; follow the
                                                     global direction filter) -->
                                                {#each monthDirections(m) as d (`${m.month}|${d.direction}`)}
                                                    <Table.Row class="{DIR_TINT[d.direction] ?? ''} text-xs">
                                                        <Table.Cell class="px-2 py-1 pl-6 whitespace-nowrap">
                                                            <span class="flex items-center gap-2 text-muted-foreground">
                                                                <span class="inline-block h-2 w-2 rounded-full {DIR_DOT[d.direction] ?? 'bg-muted-foreground'}"></span>
                                                                {$_(d.direction === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang })}
                                                                · {$_('analysis.byDirection.colTickets', { locale: $lang })}: {formatNumber(d.tickets, $lang)}
                                                            </span>
                                                        </Table.Cell>
                                                        <Table.Cell class="px-2 py-1 text-right tabular-nums text-muted-foreground">{formatMoney(d.gross, $lang)}</Table.Cell>
                                                        <Table.Cell class="px-2 py-1 text-right tabular-nums text-muted-foreground">{formatMoney(d.ktmbCost, $lang)}</Table.Cell>
                                                        <Table.Cell class="px-2 py-1" colspan={6}></Table.Cell>
                                                    </Table.Row>
                                                {/each}
                                            {/each}
                                        </Table.Body>
                                    </Table.Root>
                                </div>
                            {/if}
                            <p class="text-xs text-muted-foreground mt-3 px-2">{$_('analysis.grossNote', { locale: $lang })}</p>
                        </Card.Content>
                    </Card.Root>
                </Tabs.Content>

                <!-- 3. By day: the selected day's direction × time breakdown -->
                <Tabs.Content value="byday" class="flex flex-col gap-4">
                    <Card.Root>
                        <Card.Header class="p-4 sm:p-6">
                            <Card.Title>
                                {#if effectiveDay !== ""}
                                    {dayLabel(effectiveDay)}
                                {:else}
                                    {$_('analysis.byDay.title', { locale: $lang })}
                                {/if}
                            </Card.Title>
                            <Card.Description>{$_('analysis.byDay.description', { locale: $lang })}</Card.Description>
                        </Card.Header>
                        <Card.Content class="px-2 sm:px-6">
                            {#if dayGroup == null}
                                <p class="text-sm text-muted-foreground px-2">{$_('analysis.byDay.empty', { locale: $lang })}</p>
                            {:else}
                                <div class="overflow-x-auto">
                                    <Table.Root>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head class="h-8 px-2">{$_('analysis.byDay.colTime', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">{$_('analysis.byDay.colTickets', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">{$_('analysis.byDay.colGross', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">{$_('analysis.byDay.colKtmb', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">{$_('analysis.byDay.colNet', { locale: $lang })}</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each dayGroup.slots as s (`${s.time}|${s.direction}`)}
                                                <Table.Row class={DIR_TINT[s.direction] ?? ''}>
                                                    <Table.Cell class="px-2 py-1.5 whitespace-nowrap">
                                                        <span class="flex items-center gap-2">
                                                            <span class="inline-block h-2 w-2 rounded-full {DIR_DOT[s.direction] ?? 'bg-muted-foreground'}"></span>
                                                            {hhmm(s.time)}
                                                        </span>
                                                    </Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatNumber(s.tickets, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatMoney(s.gross, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatMoney(s.ktmbCost, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-medium {deltaClass(s.gross - s.ktmbCost)}">{formatMoney(s.gross - s.ktmbCost, $lang)}</Table.Cell>
                                                </Table.Row>
                                            {/each}
                                            <!-- day totals -->
                                            <Table.Row class="border-t-2">
                                                <Table.Cell class="px-2 py-1.5 font-semibold"></Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-semibold">{formatNumber(dayGroup.tickets, $lang)}</Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-semibold">{formatMoney(dayGroup.gross, $lang)}</Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-semibold">{formatMoney(dayGroup.ktmbCost, $lang)}</Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-bold {deltaClass(dayGroup.gross - dayGroup.ktmbCost)}">{formatMoney(dayGroup.gross - dayGroup.ktmbCost, $lang)}</Table.Cell>
                                            </Table.Row>
                                        </Table.Body>
                                    </Table.Root>
                                </div>
                            {/if}
                        </Card.Content>
                    </Card.Root>
                </Tabs.Content>

                <!-- 4. Profit by travel day: completed-bookings P&L view
                     grouped by SGT TRAVEL date (NOT completion date) and
                     bucketed into 6-hour quarters of the day. Both
                     directions merged. Each cell shows tickets, revenue,
                     cost, profit (= revenue − cost) in SGD. Cells where
                     actual-cost coverage is partial get a marker. -->
                <Tabs.Content value="profit" class="flex flex-col gap-4">
                    <Card.Root>
                        <Card.Header class="p-4 sm:p-6">
                            <Card.Title>{$_('analysis.profit.title', { locale: $lang })}</Card.Title>
                            <Card.Description>{$_('analysis.profit.description', { locale: $lang })}</Card.Description>
                        </Card.Header>
                        <Card.Content class="px-2 sm:px-6">
                            {#if profitFailed}
                                <div class="flex items-center gap-3 px-2">
                                    <p class="text-sm text-destructive">{$_('analysis.profit.loadError', { locale: $lang })}</p>
                                    <Button variant="outline" size="sm" disabled={profitLoading} on:click={loadProfit}>
                                        {$_('analysis.reload', { locale: $lang })}
                                    </Button>
                                </div>
                            {:else if profitLoading && profitRows.length === 0}
                                <Loader/>
                            {:else if profitRows.length === 0}
                                <p class="text-sm text-muted-foreground px-2">{$_('analysis.profit.empty', { locale: $lang })}</p>
                            {:else}
                                <div class="overflow-x-auto">
                                    <Table.Root>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head class="h-9 px-2 whitespace-nowrap">{$_('analysis.profit.colDate', { locale: $lang })}</Table.Head>
                                                {#each PROFIT_QUARTERS as q (q)}
                                                    <Table.Head class="h-9 px-2 text-right whitespace-nowrap">{$_(`analysis.profit.colQ${q}`, { locale: $lang })}</Table.Head>
                                                {/each}
                                                <Table.Head class="h-9 px-2 text-right whitespace-nowrap">{$_('analysis.profit.colTotal', { locale: $lang })}</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each profitRows as r (r.date)}
                                                <Table.Row>
                                                    <Table.Cell class="px-2 py-1.5 font-medium whitespace-nowrap">{travelDateLabel(r.date)}</Table.Cell>
                                                    {#each PROFIT_QUARTERS as q (q)}
                                                        {@const c = cellProfit(r, q)}
                                                        {@const incomplete = cellCostIncomplete(c)}
                                                        <Table.Cell class="px-2 py-1.5 text-right">
                                                            {#if c.tickets === 0}
                                                                <span class="text-muted-foreground/50 select-none">{$_('analysis.profit.cellEmpty', { locale: $lang })}</span>
                                                            {:else}
                                                                <div class="flex flex-col items-end tabular-nums"
                                                                     title={incomplete ? $_('analysis.profit.cellIncomplete', {
                                                                         locale: $lang,
                                                                         values: {
                                                                             actual: formatNumber(c.withActualCost, $lang),
                                                                             total: formatNumber(c.tickets, $lang),
                                                                         },
                                                                     }) : ''}>
                                                                    <span class="font-medium {deltaClass(cellNet(c))}">
                                                                        {formatMoney(cellNet(c), $lang)}
                                                                        {#if incomplete}<span class="text-amber-600 dark:text-amber-400">*</span>{/if}
                                                                    </span>
                                                                    <span class="text-xs text-muted-foreground">
                                                                        {formatNumber(c.tickets, $lang)} · {formatMoney(c.revenue, $lang)} · {formatMoney(c.cost, $lang)}
                                                                    </span>
                                                                </div>
                                                            {/if}
                                                        </Table.Cell>
                                                    {/each}
                                                    <Table.Cell class="px-2 py-1.5 text-right">
                                                        <div class="flex flex-col items-end tabular-nums">
                                                            <span class="font-semibold {deltaClass(dayProfitNet(r))}">{formatMoney(dayProfitNet(r), $lang)}</span>
                                                            <span class="text-xs text-muted-foreground">
                                                                {formatNumber(r.tickets, $lang)} · {formatMoney(r.revenue, $lang)} · {formatMoney(r.cost, $lang)}
                                                            </span>
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

                <!-- 5. Boosts: the paginated boost ledger. Admin-granted
                     boosts carry an accent "Admin" badge (full admin id in
                     the native tooltip, shortened next to it); free
                     self-boosts show "Free (targeted)". -->
                <Tabs.Content value="boosts" class="flex flex-col gap-4">
                    <Card.Root>
                        <Card.Header class="p-4 sm:p-6">
                            <Card.Title>{$_('analysis.boosts.title', { locale: $lang })}</Card.Title>
                            <Card.Description>{$_('analysis.boosts.description', { locale: $lang })}</Card.Description>
                        </Card.Header>
                        <Card.Content class="px-2 sm:px-6">
                            {#if boostsFailed}
                                <div class="flex items-center gap-3 px-2">
                                    <p class="text-sm text-destructive">{$_('analysis.boosts.loadError', { locale: $lang })}</p>
                                    <Button variant="outline" size="sm" disabled={boostsLoading} on:click={loadBoosts}>
                                        {$_('analysis.reload', { locale: $lang })}
                                    </Button>
                                </div>
                            {:else if boostsLoading && boosts.length === 0}
                                <Loader/>
                            {:else if boosts.length === 0}
                                <p class="text-sm text-muted-foreground px-2">{$_('analysis.boosts.empty', { locale: $lang })}</p>
                            {:else}
                                <div class="overflow-x-auto">
                                    <Table.Root>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head class="h-8 px-2">{$_('analysis.boosts.colWhen', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2">{$_('analysis.boosts.colUser', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2">{$_('analysis.boosts.colSlot', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right">{$_('analysis.boosts.colFee', { locale: $lang })}</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each visibleBoosts as b (`${b.bookingId}|${b.boostedAt}`)}
                                                {@const v = boostView(b)}
                                                <Table.Row>
                                                    <Table.Cell class="px-2 py-1.5 whitespace-nowrap text-sm">{formatDateTime(b.boostedAt, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-sm">
                                                        <span title={b.userId}>{b.userIdentity}</span>
                                                    </Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 whitespace-nowrap text-sm">
                                                        <span class="flex items-center gap-2 rounded px-1.5 py-0.5 {DIR_TINT[b.direction] ?? ''}">
                                                            <span class="inline-block h-2 w-2 rounded-full {DIR_DOT[b.direction] ?? 'bg-muted-foreground'}"></span>
                                                            {formatCalendarDate(calendarDateForDisplay(parseZincDate(b.date)), $lang, {day: "numeric", month: "short"})}
                                                            {hhmm(b.time)}
                                                        </span>
                                                    </Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right whitespace-nowrap">
                                                        <span class="inline-flex items-center gap-1.5 justify-end">
                                                            {#if v.admin}
                                                                <Badge class="bg-blue-600 hover:bg-blue-600/80 border-transparent text-white"
                                                                       title={$_('analysis.boosts.adminTooltip', { locale: $lang, values: { id: b.grantedBy } })}>
                                                                    {$_('analysis.boosts.adminBadge', { locale: $lang })}
                                                                </Badge>
                                                                <span class="text-[10px] text-muted-foreground font-mono" title={b.grantedBy}>{shortenId(b.grantedBy ?? "", 6, 3)}</span>
                                                            {/if}
                                                            {#if v.free}
                                                                <Badge variant="outline" class="text-green-600 dark:text-green-400">
                                                                    {$_(v.targeted ? 'analysis.boosts.freeTargeted' : 'analysis.boosts.free', { locale: $lang })}
                                                                </Badge>
                                                            {:else}
                                                                <span class="tabular-nums font-medium">{formatMoney(b.fee ?? 0, $lang)}</span>
                                                            {/if}
                                                        </span>
                                                    </Table.Cell>
                                                </Table.Row>
                                            {/each}
                                        </Table.Body>
                                    </Table.Root>
                                </div>
                                <div class="flex flex-wrap items-center justify-between gap-2 mt-3 px-2">
                                    <span class="text-xs text-muted-foreground tabular-nums">
                                        {$_('analysis.boosts.pageInfo', { locale: $lang, values: {
                                            from: formatNumber(Math.min(boostSkip + 1, boostTotal), $lang),
                                            to: formatNumber(Math.min(boostSkip + boosts.length, boostTotal), $lang),
                                            total: formatNumber(boostTotal, $lang),
                                        } })}
                                    </span>
                                    <span class="flex items-center gap-1">
                                        <Button variant="outline" size="icon" class="h-8 w-8"
                                                aria-label={$_('analysis.boosts.prevPage', { locale: $lang })}
                                                disabled={boostsLoading || boostSkip === 0}
                                                on:click={() => boostPage(-1)}>
                                            <ChevronLeft class="h-4 w-4"/>
                                        </Button>
                                        <Button variant="outline" size="icon" class="h-8 w-8"
                                                aria-label={$_('analysis.boosts.nextPage', { locale: $lang })}
                                                disabled={boostsLoading || boostSkip + BOOST_LIMIT >= boostTotal}
                                                on:click={() => boostPage(1)}>
                                            <ChevronRight class="h-4 w-4"/>
                                        </Button>
                                    </span>
                                </div>
                            {/if}
                        </Card.Content>
                    </Card.Root>
                </Tabs.Content>

                <!-- 5. Payments: captured payments (deposit evidence, newest
                     first, ≤100) — moved from the old single-page layout -->
                <Tabs.Content value="payments" class="flex flex-col gap-4">
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
                </Tabs.Content>

                <!-- 7. Withdrawals: terminal-event breakdown of paid-out
                     withdrawals per SGT calendar month, fed by the same
                     /pnl/terminal endpoint /pnl uses. Shows why withdrawals
                     are a structural loss — every withdrawn dollar
                     materializes the deposit fee (gwRate × gross) and adds
                     payout fees, while the 4% withdrawal fee offsets only
                     part of it. -->
                {#if tab === "withdrawals"}
                    {@const wdRows = withdrawalRaw ?? []}
                    {@const wdTotal = withdrawalTotals(wdRows)}
                    <Card.Root>
                        <Card.Header class="p-4 sm:p-6">
                            <Card.Title>{$_('analysis.withdrawals.title', { locale: $lang })}</Card.Title>
                            <Card.Description>{$_('analysis.withdrawals.description', { locale: $lang })}</Card.Description>
                        </Card.Header>
                        <Card.Content class="px-2 sm:px-6">
                            {#if withdrawalsFailed}
                                <div class="flex items-center gap-3 px-2">
                                    <p class="text-sm text-destructive">{$_('analysis.withdrawals.loadError', { locale: $lang })}</p>
                                    <Button variant="outline" size="sm" disabled={withdrawalsLoading} on:click={loadWithdrawals}>
                                        {$_('analysis.reload', { locale: $lang })}
                                    </Button>
                                </div>
                            {:else if withdrawalsLoading && withdrawalRaw == null}
                                <Loader/>
                            {:else if wdRows.length === 0}
                                <p class="text-sm text-muted-foreground px-2">{$_('analysis.withdrawals.empty', { locale: $lang })}</p>
                            {:else}
                                <div class="overflow-x-auto">
                                    <Table.Root>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head class="h-8 px-2 whitespace-nowrap">{$_('analysis.withdrawals.colMonth', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('analysis.withdrawals.colCount', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('analysis.withdrawals.colGross', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('analysis.withdrawals.colFeeIncome', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('analysis.withdrawals.colDepositFee', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('analysis.withdrawals.colPayoutFees', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-8 px-2 text-right whitespace-nowrap">
                                                    <span class="inline-flex items-center gap-1">
                                                        {$_('analysis.withdrawals.colNetLoss', { locale: $lang })}
                                                        <InfoTip label={$_('analysis.withdrawals.colNetLoss', { locale: $lang })}>
                                                            {$_('analysis.withdrawals.grossNote', { locale: $lang })}
                                                        </InfoTip>
                                                    </span>
                                                </Table.Head>
                                                <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('analysis.withdrawals.colBlendedLossPct', { locale: $lang })}</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each wdRows as r (r.month)}
                                                {@const b = pnlWithdrawalBreakdown(r)}
                                                {@const netLoss = withdrawalLossAmount(r)}
                                                {@const blended = blendedLossPct(r)}
                                                <Table.Row class={r.withdrawalGross === 0 && r.feeIncome === 0 ? 'text-muted-foreground/60' : ''}>
                                                    <Table.Cell class="px-2 py-1.5 font-medium whitespace-nowrap">{monthLabel(r.month)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatNumber(r.withdrawalCount, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatMoney(r.withdrawalGross, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{formatMoney(b.feeIncome, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{formatMoney(b.depositFee, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{formatMoney(b.payoutFees, $lang)}</Table.Cell>
                                                    <!-- netLoss is a LOSS figure (positive = money lost), so the
                                                         delta color inverts: red for a loss, green for a gain -->
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-medium {deltaClass(-netLoss)}">{formatMoney(netLoss, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right tabular-nums">
                                                        {#if blended == null}
                                                            {$_('analysis.withdrawals.blendedLossDash', { locale: $lang })}
                                                        {:else}
                                                            {(blended * 100).toFixed(1)}%
                                                        {/if}
                                                    </Table.Cell>
                                                </Table.Row>
                                            {/each}
                                            <!-- range totals: each month keeps its own
                                                 gwRate, so blendedLossPct is re-derived on
                                                 the summed gross rather than summed -->
                                            <Table.Row class="border-t-2 bg-muted/30">
                                                <Table.Cell class="px-2 py-1.5 font-semibold whitespace-nowrap">{$_('pnl.total', { locale: $lang })}</Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-semibold">{formatNumber(wdTotal.count, $lang)}</Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-semibold">{formatMoney(wdTotal.gross, $lang)}</Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-semibold text-muted-foreground">{formatMoney(wdTotal.feeIncome, $lang)}</Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-semibold text-muted-foreground">{formatMoney(wdTotal.depositFee, $lang)}</Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-semibold text-muted-foreground">{formatMoney(wdTotal.payoutFees, $lang)}</Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-bold {deltaClass(-wdTotal.netLoss)}">{formatMoney(wdTotal.netLoss, $lang)}</Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-semibold">
                                                    {#if wdTotal.blendedLossPct == null}
                                                        {$_('analysis.withdrawals.blendedLossDash', { locale: $lang })}
                                                    {:else}
                                                        {(wdTotal.blendedLossPct * 100).toFixed(1)}%
                                                    {/if}
                                                </Table.Cell>
                                            </Table.Row>
                                        </Table.Body>
                                    </Table.Root>
                                </div>
                                <p class="text-xs text-muted-foreground mt-3 px-2">{$_('analysis.withdrawals.grossNote', { locale: $lang })}</p>
                            {/if}
                        </Card.Content>
                    </Card.Root>
                {/if}

                <!-- 8. FX rates: the MYR→SGD FX rate editor that powers the
                     conversion of actual KTMB costs into SGD (configuration
                     lives WITH the analysis it powers) -->
                <Tabs.Content value="costs" class="flex flex-col gap-4">
                    <KtmbFxSection/>
                </Tabs.Content>
            </Tabs.Root>
        {/if}
    </div>
</div>
