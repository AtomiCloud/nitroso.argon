<script lang="ts">
    import {onMount, tick} from "svelte";
    import {page} from "$app/stores";
    import {afterNavigate, goto} from "$app/navigation";
    import {api} from "../../store";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";

    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";

    //@ts-ignore
    import * as Table from "$lib/components/ui/table";

    //@ts-ignore
    import * as Tabs from "$lib/components/ui/tabs";

    import {Calendar} from "$lib/components/ui/calendar";
    import {Button} from "$lib/components/ui/button";
    import {Badge} from "$lib/components/ui/badge";
    import {cn} from "$lib/utils";
    import {CalendarDate, type DateValue, getLocalTimeZone} from "@internationalized/date";
    import {singaporeToday} from "$lib/time/singapore";
    import {CalendarIcon, LucideLoader, RotateCw} from "lucide-svelte";
    import type {
        BookingAnalysisPnlRowRes,
        BookingTerminalPnlRowRes,
    } from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import Loader from "$lib/components/complex/loader.svelte";
    import InfoTip from "$lib/components/core/InfoTip.svelte";
    import HistoryGateNote from "$lib/components/complex/HistoryGateNote.svelte";
    import {_} from "svelte-i18n";
    import {lang, formatCalendarDate, formatMoney, formatNumber} from "$lib/i18n";
    import {
        PNL_TABS,
        completedProfit,
        ebitda,
        estimatedRecoveryCount,
        pickParam,
        pnlCashNet,
        pnlTotals,
        pnlZeroFill,
        terminalTotals,
        terminalZeroFill,
        terminatedProfit,
        withdrawalProfit,
        type PnlMonthRow,
        type TerminalPnlRow,
    } from "./pnl";

    // Admin-only P&L page — BunnyBooker's single money view (server-side
    // gated like /analysis; see +page.server.ts).
    //
    // Two tabs over one monthly table shape:
    //   Earned    the terminal-event model (GET Booking/pnl/terminal):
    //             profit is recognized when money reaches a terminal state —
    //             a booking completes, a booking terminates, or a withdrawal
    //             pays out — and every deposited dollar carries its
    //             gateway-fee share to its terminal event at the month's
    //             blended gwRate. The headline number is EBITDA.
    //   Cash      the cash rollup (GET Booking/analysis/pnl, re-homed from
    //             the retired /analysis P&L tab): deposits − net payouts −
    //             gateway fees, counting unspent wallet float as cash.
    // The active tab and the date range are mirrored into the URL query
    // string (tab/from/to, defaults omitted; tab switches PUSH history,
    // range changes replace) so back / refresh / share reproduce the view.

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

    // default range = the last 6 months, on Singapore's calendar (terminal
    // events are recognized on SGT dates — a browser in another timezone
    // must not shift the window by a day around local midnight)
    const today = singaporeToday();
    let after: DateValue | undefined = today.subtract({months: 6});
    let before: DateValue | undefined = today;

    function rangeQuery() {
        return {
            ...(after == null ? {} : {After: toApiDate(after)}),
            ...(before == null ? {} : {Before: toApiDate(before)}),
        };
    }

    // ---- the two fetches are independent — each tolerates its own failure
    // without blanking the other tab. Race-guarded: rapid range changes
    // would otherwise let a late response clobber a newer one. ----
    let terminalRaw: BookingTerminalPnlRowRes[] = [];
    let terminalLoading = false;
    let terminalFailed = false;
    let terminalToken = 0;

    async function loadTerminal() {
        const myToken = ++terminalToken;
        terminalLoading = true;
        terminalFailed = false;
        await toResult(() => $api.vBookingPnlTerminalDetail("1", rangeQuery()),
            $_('pnl.earned.loadError', {locale: $lang})).match({
            ok: (r) => {
                if (myToken !== terminalToken) return;
                terminalRaw = r;
                terminalFailed = false;
            },
            err: (e) => {
                if (myToken !== terminalToken) return;
                console.error(e);
                terminalFailed = true;
            }
        });
        if (myToken === terminalToken) terminalLoading = false;
    }

    let cashRaw: BookingAnalysisPnlRowRes[] = [];
    let cashLoading = false;
    let cashFailed = false;
    let cashToken = 0;

    async function loadCash() {
        const myToken = ++cashToken;
        cashLoading = true;
        cashFailed = false;
        await toResult(() => $api.vBookingAnalysisPnlDetail("1", rangeQuery()),
            $_('pnl.cash.loadError', {locale: $lang})).match({
            ok: (r) => {
                if (myToken !== cashToken) return;
                cashRaw = r;
                cashFailed = false;
            },
            err: (e) => {
                if (myToken !== cashToken) return;
                console.error(e);
                cashFailed = true;
            }
        });
        if (myToken === cashToken) cashLoading = false;
    }

    function load() {
        loadTerminal();
        loadCash();
    }

    async function rangeChange() {
        await tick();
        load();
    }

    // both tables are zero-filled across the picked range so months with no
    // activity still appear (otherwise the table jumps between active months
    // and reading a "losing streak" is harder). Bounds are MM-yyyy labels
    // derived from the same day-level pickers; the zero-fills fall back to a
    // plain sort when either bound is missing.
    $: bounds = {
        from: after == null ? "" : `${String(after.month).padStart(2, "0")}-${after.year}`,
        to: before == null ? "" : `${String(before.month).padStart(2, "0")}-${before.year}`,
    };
    $: terminalRows = terminalZeroFill(terminalRaw, bounds.from, bounds.to);
    $: terminalTotal = terminalTotals(terminalRows);
    $: cashRows = pnlZeroFill(cashRaw, bounds.from, bounds.to);
    $: cashTotal = pnlTotals(cashRows);

    function deltaClass(delta: number): string {
        if (delta > 0) return "text-green-600 dark:text-green-400";
        if (delta < 0) return "text-red-600 dark:text-red-400";
        return "";
    }

    function monthLabel(month: string): string {
        // zinc's MM-yyyy → a localized "Jul 2026"
        const m = /^(\d{2})-(\d{4})$/.exec(month);
        if (m == null) return month;
        return formatCalendarDate(new Date(Number(m[2]), Number(m[1]) - 1, 1), $lang, {month: "short", year: "numeric"});
    }

    // the per-month blended gateway-fee rate chip, e.g. "3.3%" (gwRate is a
    // fraction on the wire)
    function gwRateChip(rate: number): string {
        return `${(rate * 100).toFixed(1)}%`;
    }

    function terminalRowEmpty(r: TerminalPnlRow): boolean {
        return r.deposits === 0 && r.collected === 0 && r.kept === 0 && r.withdrawalGross === 0
            && r.completedCount === 0 && r.terminatedCount === 0 && r.withdrawalCount === 0;
    }

    function cashRowEmpty(r: PnlMonthRow): boolean {
        return r.deposits === 0 && r.withdrawalTotal === 0 && r.gatewayFees === 0 && r.withdrawalFeeIncome === 0;
    }

    function estimateTitle(r: Pick<TerminalPnlRow, 'terminatedCount' | 'withExactRefund'>): string {
        return $_('pnl.earned.estimateNote', {
            locale: $lang,
            values: {
                n: formatNumber(estimatedRecoveryCount(r), $lang),
                m: formatNumber(r.terminatedCount, $lang),
            },
        });
    }

    // ---- tabs over the shared state ----
    let tab = "earned";

    // ---- URL-encoded view state ----
    // Same pattern as /analysis and /partners (applyUrl/serializeUrl/syncUrl
    // with loop guards): tab/from/to mirrored into the query string, defaults
    // omitted; tab switches PUSH history entries (browser Back walks the tab
    // trail), range changes replace the current entry; browser back/forward
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

    function applyUrl(q: URLSearchParams) {
        tab = pickParam(q.get("tab"), PNL_TABS) || "earned";
        lastTab = tab;
        after = urlDate(q.get("from")) ?? fromApiDate(defAfterStr) ?? undefined;
        before = urlDate(q.get("to")) ?? fromApiDate(defBeforeStr) ?? undefined;
    }

    function serializeUrl(): string {
        const q = new URLSearchParams();
        if (tab !== "earned") q.set("tab", tab);
        const a = after == null ? "" : toApiDate(after);
        const b = before == null ? "" : toApiDate(before);
        if (a && a !== defAfterStr) q.set("from", a);
        if (b && b !== defBeforeStr) q.set("to", b);
        return q.toString();
    }

    $: if (urlReady) syncUrl(tab, after, before);

    function syncUrl(..._deps: unknown[]) {
        const search = serializeUrl();
        const push = tab !== lastTab;
        lastTab = tab;
        if (search === $page.url.searchParams.toString()) return;
        goto(`${$page.url.pathname}${search ? `?${search}` : ""}`,
            {replaceState: !push, keepFocus: true, noScroll: true});
    }

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
        load();
    });

    // browser back/forward moves the URL without remounting — reapply the
    // tab/range it encodes (syncUrl's own goto()s serialize to the same
    // params, so onUrlChange no-ops for self-inflicted navigations)
    afterNavigate(() => {
        if (!urlReady) return;
        onUrlChange($page.url);
    });
</script>

<div class="flex flex-col">
    <div class="border-b bg-muted">
        <div class="flex justify-center sm:justify-between gap-4 flex-wrap py-8 items-center text-foreground max-w-[1200px] w-11/12 mx-auto">
            <div class="text-3xl lg:text-4xl">
                {$_('pnl.title', { locale: $lang })}
            </div>
            <Button variant="outline" disabled={terminalLoading || cashLoading} on:click={load}>
                {#if terminalLoading || cashLoading}
                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                {:else}
                    <RotateCw class="mr-2 h-4 w-4"/>
                {/if}
                {$_('pnl.reload', { locale: $lang })}
            </Button>
        </div>
    </div>
    <div class="flex flex-col gap-4 w-full px-2 sm:px-0 sm:w-11/12 max-w-[1200px] mx-auto my-4 sm:my-8">

        <!-- date-range filter bar (same convention as /analysis; refetches
             both tabs). Everything WRAPS — no horizontal scrolling. -->
        <div class="-mx-2 px-2 py-2 sm:mx-0 sm:px-3 bg-background border-y sm:border sm:rounded-lg flex flex-wrap gap-2 items-center">
            <Popover.Root>
                <Popover.Trigger asChild let:builder>
                    <Button variant="outline"
                            class={cn("h-8 px-2 text-xs justify-start font-normal shrink-0", !after && "text-muted-foreground")}
                            builders={[builder]}>
                        <CalendarIcon class="mr-1.5 h-3.5 w-3.5"/>
                        {after ? formatCalendarDate(after.toDate(getLocalTimeZone()), $lang, {day: "numeric", month: "short", year: "2-digit"}) : $_('pnl.range.after', { locale: $lang })}
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
                        {before ? formatCalendarDate(before.toDate(getLocalTimeZone()), $lang, {day: "numeric", month: "short", year: "2-digit"}) : $_('pnl.range.before', { locale: $lang })}
                    </Button>
                </Popover.Trigger>
                <Popover.Content class="w-auto p-0" align="start">
                    <Calendar bind:value={before} onValueChange={rangeChange}/>
                </Popover.Content>
            </Popover.Root>
            <span class="text-xs text-muted-foreground">{$_('pnl.range.hint', { locale: $lang })}</span>
        </div>
        <HistoryGateNote from={after} />

        <Tabs.Root bind:value={tab}>
            <div class="overflow-x-auto">
                <Tabs.List class="w-max h-9">
                    <Tabs.Trigger value="earned" class="text-xs sm:text-sm px-2.5">{$_('pnl.tabs.earned', { locale: $lang })}</Tabs.Trigger>
                    <Tabs.Trigger value="cash" class="text-xs sm:text-sm px-2.5">{$_('pnl.tabs.cash', { locale: $lang })}</Tabs.Trigger>
                </Tabs.List>
            </div>

            <!-- 1. EARNED (EBITDA): the terminal-event model. Per month:
                 completedProfit  = collected − ktmbCost − gwRate×collected
                 terminatedProfit = kept − ktmbCostNet − gwRate×kept
                 withdrawalProfit = feeIncome − gwRate×gross − payoutFees
                 ebitda = the three summed. Months where some terminated
                 bookings lack an exact KTMB refund carry an asterisk (the
                 recovery is estimated at 50% for those). -->
            <Tabs.Content value="earned" class="flex flex-col gap-4">
                <Card.Root>
                    <Card.Header class="p-4 sm:p-6">
                        <Card.Title>{$_('pnl.earned.title', { locale: $lang })}</Card.Title>
                        <Card.Description>{$_('pnl.earned.description', { locale: $lang })}</Card.Description>
                    </Card.Header>
                    <Card.Content class="px-2 sm:px-6">
                        {#if terminalFailed}
                            <div class="flex items-center gap-3 px-2">
                                <p class="text-sm text-destructive">{$_('pnl.earned.loadError', { locale: $lang })}</p>
                                <Button variant="outline" size="sm" disabled={terminalLoading} on:click={loadTerminal}>
                                    {$_('pnl.reload', { locale: $lang })}
                                </Button>
                            </div>
                        {:else if terminalLoading && terminalRaw.length === 0}
                            <Loader/>
                        {:else}
                            <div class="overflow-x-auto">
                                <Table.Root>
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.Head class="h-8 px-2 whitespace-nowrap">{$_('pnl.colMonth', { locale: $lang })}</Table.Head>
                                            <Table.Head class="h-8 px-2 text-right whitespace-nowrap">
                                                <span class="inline-flex items-center gap-1">
                                                    {$_('pnl.earned.colCompleted', { locale: $lang })}
                                                    <InfoTip label={$_('pnl.earned.colCompleted', { locale: $lang })}>
                                                        {$_('pnl.earned.completedHint', { locale: $lang })}
                                                    </InfoTip>
                                                </span>
                                            </Table.Head>
                                            <Table.Head class="h-8 px-2 text-right whitespace-nowrap">
                                                <span class="inline-flex items-center gap-1">
                                                    {$_('pnl.earned.colTerminated', { locale: $lang })}
                                                    <InfoTip label={$_('pnl.earned.colTerminated', { locale: $lang })}>
                                                        {$_('pnl.earned.terminatedHint', { locale: $lang })}
                                                    </InfoTip>
                                                </span>
                                            </Table.Head>
                                            <Table.Head class="h-8 px-2 text-right whitespace-nowrap">
                                                <span class="inline-flex items-center gap-1">
                                                    {$_('pnl.earned.colWithdrawals', { locale: $lang })}
                                                    <InfoTip label={$_('pnl.earned.colWithdrawals', { locale: $lang })}>
                                                        {$_('pnl.earned.withdrawalsHint', { locale: $lang })}
                                                    </InfoTip>
                                                </span>
                                            </Table.Head>
                                            <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('pnl.earned.colEbitda', { locale: $lang })}</Table.Head>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {#each terminalRows as r (r.month)}
                                            <Table.Row class={terminalRowEmpty(r) ? 'text-muted-foreground/60' : ''}>
                                                <Table.Cell class="px-2 py-1.5 font-medium whitespace-nowrap">
                                                    <span class="inline-flex items-center gap-1.5">
                                                        {monthLabel(r.month)}
                                                        <Badge variant="outline" class="px-1.5 py-0 text-[10px] font-normal tabular-nums"
                                                               title={$_('pnl.earned.gwRateHint', { locale: $lang })}>
                                                            {gwRateChip(r.gwRate)}
                                                        </Badge>
                                                    </span>
                                                </Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right">
                                                    <div class="flex flex-col items-end tabular-nums leading-tight">
                                                        <span class="font-medium {deltaClass(completedProfit(r))}">{formatMoney(completedProfit(r), $lang)}</span>
                                                        <span class="text-xs text-muted-foreground">
                                                            {$_('pnl.detail', { locale: $lang, values: {
                                                                count: formatNumber(r.completedCount, $lang),
                                                                amount: formatMoney(r.collected, $lang),
                                                            } })}
                                                        </span>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right">
                                                    <div class="flex flex-col items-end tabular-nums leading-tight"
                                                         title={estimatedRecoveryCount(r) > 0 ? estimateTitle(r) : ''}>
                                                        <span class="font-medium {deltaClass(terminatedProfit(r))}">
                                                            {formatMoney(terminatedProfit(r), $lang)}
                                                            {#if estimatedRecoveryCount(r) > 0}<span class="text-amber-600 dark:text-amber-400">*</span>{/if}
                                                        </span>
                                                        <span class="text-xs text-muted-foreground">
                                                            {$_('pnl.detail', { locale: $lang, values: {
                                                                count: formatNumber(r.terminatedCount, $lang),
                                                                amount: formatMoney(r.kept, $lang),
                                                            } })}
                                                        </span>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right">
                                                    <div class="flex flex-col items-end tabular-nums leading-tight">
                                                        <span class="font-medium {deltaClass(withdrawalProfit(r))}">{formatMoney(withdrawalProfit(r), $lang)}</span>
                                                        <span class="text-xs text-muted-foreground">
                                                            {$_('pnl.detail', { locale: $lang, values: {
                                                                count: formatNumber(r.withdrawalCount, $lang),
                                                                amount: formatMoney(r.withdrawalGross, $lang),
                                                            } })}
                                                        </span>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-bold {deltaClass(ebitda(r))}">{formatMoney(ebitda(r), $lang)}</Table.Cell>
                                            </Table.Row>
                                        {/each}
                                        <!-- range totals row: profit lines are SUMS of the
                                             monthly profits (each month keeps its own
                                             gwRate); the chip is the range-blended rate,
                                             context only -->
                                        <Table.Row class="border-t-2 bg-muted/30">
                                            <Table.Cell class="px-2 py-1.5 font-semibold whitespace-nowrap">
                                                <span class="inline-flex items-center gap-1.5">
                                                    {$_('pnl.total', { locale: $lang })}
                                                    <Badge variant="outline" class="px-1.5 py-0 text-[10px] font-normal tabular-nums"
                                                           title={$_('pnl.earned.gwRateHint', { locale: $lang })}>
                                                        {gwRateChip(terminalTotal.gwRate)}
                                                    </Badge>
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell class="px-2 py-1.5 text-right">
                                                <div class="flex flex-col items-end tabular-nums leading-tight">
                                                    <span class="font-semibold {deltaClass(terminalTotal.completedProfit)}">{formatMoney(terminalTotal.completedProfit, $lang)}</span>
                                                    <span class="text-xs text-muted-foreground">
                                                        {$_('pnl.detail', { locale: $lang, values: {
                                                            count: formatNumber(terminalTotal.completedCount, $lang),
                                                            amount: formatMoney(terminalTotal.collected, $lang),
                                                        } })}
                                                    </span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell class="px-2 py-1.5 text-right">
                                                <div class="flex flex-col items-end tabular-nums leading-tight"
                                                     title={estimatedRecoveryCount(terminalTotal) > 0 ? estimateTitle(terminalTotal) : ''}>
                                                    <span class="font-semibold {deltaClass(terminalTotal.terminatedProfit)}">
                                                        {formatMoney(terminalTotal.terminatedProfit, $lang)}
                                                        {#if estimatedRecoveryCount(terminalTotal) > 0}<span class="text-amber-600 dark:text-amber-400">*</span>{/if}
                                                    </span>
                                                    <span class="text-xs text-muted-foreground">
                                                        {$_('pnl.detail', { locale: $lang, values: {
                                                            count: formatNumber(terminalTotal.terminatedCount, $lang),
                                                            amount: formatMoney(terminalTotal.kept, $lang),
                                                        } })}
                                                    </span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell class="px-2 py-1.5 text-right">
                                                <div class="flex flex-col items-end tabular-nums leading-tight">
                                                    <span class="font-semibold {deltaClass(terminalTotal.withdrawalProfit)}">{formatMoney(terminalTotal.withdrawalProfit, $lang)}</span>
                                                    <span class="text-xs text-muted-foreground">
                                                        {$_('pnl.detail', { locale: $lang, values: {
                                                            count: formatNumber(terminalTotal.withdrawalCount, $lang),
                                                            amount: formatMoney(terminalTotal.withdrawalGross, $lang),
                                                        } })}
                                                    </span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-bold {deltaClass(terminalTotal.ebitda)}">{formatMoney(terminalTotal.ebitda, $lang)}</Table.Cell>
                                        </Table.Row>
                                    </Table.Body>
                                </Table.Root>
                            </div>
                        {/if}
                    </Card.Content>
                </Card.Root>
            </Tabs.Content>

            <!-- 2. CASH: the cash rollup re-homed from the retired /analysis
                 P&L tab. cash net = deposits − net payouts (gross
                 withdrawals minus the fee we keep) − gateway fees; unspent
                 wallet float counts as BunnyBooker cash (the caption below
                 the table says so). -->
            <Tabs.Content value="cash" class="flex flex-col gap-4">
                <Card.Root>
                    <Card.Header class="p-4 sm:p-6">
                        <Card.Title>{$_('pnl.cash.title', { locale: $lang })}</Card.Title>
                        <Card.Description>{$_('pnl.cash.description', { locale: $lang })}</Card.Description>
                    </Card.Header>
                    <Card.Content class="px-2 sm:px-6">
                        {#if cashFailed}
                            <div class="flex items-center gap-3 px-2">
                                <p class="text-sm text-destructive">{$_('pnl.cash.loadError', { locale: $lang })}</p>
                                <Button variant="outline" size="sm" disabled={cashLoading} on:click={loadCash}>
                                    {$_('pnl.reload', { locale: $lang })}
                                </Button>
                            </div>
                        {:else if cashLoading && cashRaw.length === 0}
                            <Loader/>
                        {:else}
                            <div class="overflow-x-auto">
                                <Table.Root>
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.Head class="h-8 px-2 whitespace-nowrap">{$_('pnl.colMonth', { locale: $lang })}</Table.Head>
                                            <Table.Head class="h-8 px-2 text-right">{$_('pnl.cash.colDeposits', { locale: $lang })}</Table.Head>
                                            <Table.Head class="h-8 px-2 text-right">{$_('pnl.cash.colWithdrawals', { locale: $lang })}</Table.Head>
                                            <Table.Head class="h-8 px-2 text-right">{$_('pnl.cash.colGwFees', { locale: $lang })}</Table.Head>
                                            <Table.Head class="h-8 px-2 text-right">{$_('pnl.cash.colCashNet', { locale: $lang })}</Table.Head>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {#each cashRows as r (r.month)}
                                            <Table.Row class={cashRowEmpty(r) ? 'text-muted-foreground/60' : ''}>
                                                <Table.Cell class="px-2 py-1.5 font-medium whitespace-nowrap">{monthLabel(r.month)}</Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatMoney(r.deposits, $lang)}</Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums">
                                                    {$_('pnl.cash.withdrawals', {
                                                        locale: $lang,
                                                        values: {
                                                            count: formatNumber(r.withdrawalCount, $lang),
                                                            total: formatMoney(r.withdrawalTotal, $lang),
                                                        },
                                                    })}
                                                </Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatMoney(r.gatewayFees, $lang)}</Table.Cell>
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-bold {deltaClass(pnlCashNet(r))}">{formatMoney(pnlCashNet(r), $lang)}</Table.Cell>
                                            </Table.Row>
                                        {/each}
                                        <!-- range totals row -->
                                        <Table.Row class="border-t-2 bg-muted/30">
                                            <Table.Cell class="px-2 py-1.5 font-semibold whitespace-nowrap">{$_('pnl.total', { locale: $lang })}</Table.Cell>
                                            <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-semibold">{formatMoney(cashTotal.deposits, $lang)}</Table.Cell>
                                            <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-semibold">
                                                {$_('pnl.cash.withdrawals', {
                                                    locale: $lang,
                                                    values: {
                                                        count: formatNumber(cashTotal.withdrawalCount, $lang),
                                                        total: formatMoney(cashTotal.withdrawalTotal, $lang),
                                                    },
                                                })}
                                            </Table.Cell>
                                            <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-semibold">{formatMoney(cashTotal.gatewayFees, $lang)}</Table.Cell>
                                            <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-bold {deltaClass(pnlCashNet(cashTotal))}">{formatMoney(pnlCashNet(cashTotal), $lang)}</Table.Cell>
                                        </Table.Row>
                                    </Table.Body>
                                </Table.Root>
                            </div>
                            <p class="text-xs text-muted-foreground mt-3 px-2">{$_('pnl.cash.cashNote', { locale: $lang })}</p>
                        {/if}
                    </Card.Content>
                </Card.Root>
            </Tabs.Content>
        </Tabs.Root>
    </div>
</div>
