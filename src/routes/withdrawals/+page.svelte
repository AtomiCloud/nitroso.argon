<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    import type {WithdrawalPrincipalRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../errors/problem_details";
    import {Res} from "$lib/core/result";
    import {problem} from "../../store";
    import Loader from "$lib/components/complex/loader.svelte";
    import {Input} from "$lib/components/ui/input";
    import {page} from "$app/stores";
    import {afterNavigate, goto} from "$app/navigation";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Table from "$lib/components/ui/table";

    //@ts-ignore
    import * as Select from "$lib/components/ui/select";

    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    import DateRangePicker from "$lib/components/complex/DateRangePicker.svelte";
    import type {DateRange, Selected} from "bits-ui";
    import {CalendarDate, type DateValue} from "@internationalized/date";
    import {ArrowLeftRight} from "lucide-svelte";
    import {WITHDRAWAL_STATUS, WITHDRAWAL_STATUS_BADGE} from "./withdrawal_status";
    import {Button} from "$lib/components/ui/button";
    import CreateWithdrawal from "$lib/components/entities/Withdrawals/CreateWithdrawal.svelte";
    import ExportWithdrawals from "$lib/components/entities/Withdrawals/ExportWithdrawals.svelte";
    import {withdrawalFiltersFromUrl} from "$lib/components/entities/Withdrawals/withdrawal-export";
    import {Badge} from "$lib/components/ui/badge";
    import ApproveWithdrawal from "$lib/components/entities/Withdrawals/ApproveWithdrawal.svelte";
    import CompleteWithdrawalManual from "$lib/components/entities/Withdrawals/CompleteWithdrawalManual.svelte";
    import RejectWithdrawal from "$lib/components/entities/Withdrawals/RejectWithdrawal.svelte";
    import CancelWithdrawal from "$lib/components/entities/Withdrawals/CancelWithdrawal.svelte";
    import WithdrawalPayoutDetails from "$lib/components/entities/Withdrawals/WithdrawalPayoutDetails.svelte";
    import {isCardRefund, cardRefundTitleI18nKey} from "$lib/components/entities/Withdrawals/withdrawal";
    import {
        WITHDRAWAL_PAGE_SIZE,
        pageFromParam,
        paginateWithdrawals,
        totalPages as computeTotalPages,
        withdrawalMatchesSearch,
    } from "$lib/components/entities/Withdrawals/withdrawal-list";
    import type {PageData} from "./$types";
    import {format, parse} from "date-fns";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatDateTime} from "$lib/i18n";

    export let data: PageData;

    // Util
    function toCalDate(s: string): DateValue | undefined {
        if (s == "") return undefined;
        const [d, m, y] = s.split("-");
        return new CalendarDate(parseInt(y), parseInt(m), parseInt(d));
    }

    function toZincDate(s?: DateValue): string {
        if (s == null) return "";
        const t = parse(s.toString(), "yyyy-MM-dd", new Date())
        return format(t, "dd-MM-yyyy");
    }

    $: withdrawals = (Res.fromSerial<WithdrawalPrincipalRes[], ProblemDetails>(data.result)
        .match({
            ok: (a: WithdrawalPrincipalRes[]): WithdrawalPrincipalRes[] => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e);
                return null as never;
            }
        }) satisfies Promise<WithdrawalPrincipalRes[]>)

    let userId = $page.url.searchParams.get("userId") ?? "";
    let completerId = $page.url.searchParams.get("completerId") ?? "";
    let withdrawalId = $page.url.searchParams.get("id") ?? "";
    let min = $page.url.searchParams.get("min");
    let max = $page.url.searchParams.get("max");

    // Client-side search + pagination state. Search is applied to rows
    // returned by the (server-side-filtered) load; the rows are then sliced
    // client-side at WITHDRAWAL_PAGE_SIZE per page. Which page is shown
    // lives in the URL (?page=N) — see gotoPage below.
    let searchTerm = $page.url.searchParams.get("search") ?? "";
    let currentPage: number = pageFromParam($page.url.searchParams.get("page"));

    let status = $page.url.searchParams.get("status") ?? "";

    let withdrawStatus: Selected<string> | undefined = WITHDRAWAL_STATUS[status];

    // Browser back/forward navigates but never remounts this component, so
    // the init-time state above goes stale: the inputs/select/date-range
    // (and the page number) keep showing the previous entry's values over
    // the new entry's URL. Re-seed them from the URL. This is what makes
    // Back walk the page trail — a page-only entry does not re-run the load
    // at all (see gotoPage), so this hook is the ONLY thing that moves
    // `currentPage` back. Guarded by comparing against our own
    // triggerSearch() serialization so self-inflicted navigations no-op
    // (same treatment as /partners, #300).
    afterNavigate(() => {
        const q = $page.url.searchParams;
        // A pending debounce means the user is mid-keystroke and the URL is
        // knowingly BEHIND the text inputs — re-seeding them from it would
        // silently retype the old value under the cursor. Now that a page
        // click is a real navigation, that window is reachable: type, then
        // click Next inside 400ms. Leave the text alone and let the debounce
        // land it (which resets to page 1, as any filter change does); the
        // non-text state below is unaffected and still syncs.
        const typing = searchDebounce !== undefined;
        const urlUserId = q.get("userId") ?? "";
        const urlCompleterId = q.get("completerId") ?? "";
        const urlWithdrawalId = q.get("id") ?? "";
        const urlMin = q.get("min");
        const urlMax = q.get("max");
        const urlSearch = q.get("search") ?? "";
        const urlStatus = q.get("status") ?? "";
        const urlAfter = q.get("after") || "";
        const urlBefore = q.get("before") || "";
        if (!typing) {
            if (urlUserId !== userId) userId = urlUserId;
            if (urlCompleterId !== completerId) completerId = urlCompleterId;
            if (urlWithdrawalId !== withdrawalId) withdrawalId = urlWithdrawalId;
            if ((urlMin ?? "") !== (min ?? "")) min = urlMin;
            if ((urlMax ?? "") !== (max ?? "")) max = urlMax;
            if (urlSearch !== searchTerm) searchTerm = urlSearch;
        }
        const urlPage = pageFromParam(q.get("page"));
        if (urlPage !== currentPage) currentPage = urlPage;
        if (urlStatus !== (withdrawStatus?.value ?? "")) withdrawStatus = WITHDRAWAL_STATUS[urlStatus];
        const curAfter = toZincDate(dateFilter.start);
        const curBefore = toZincDate(dateFilter.end);
        if (urlAfter !== curAfter || urlBefore !== curBefore) {
            dateFilter = {start: toCalDate(urlAfter), end: toCalDate(urlBefore)};
        }
    });

    // Keep the closed-trigger label localized for deep-linked / language-switched
    // state; the menu items are already translated but `Selected.label` defaults
    // to the English constant.
    $: if (withdrawStatus?.value) {
        const translated = $_(`withdrawals.status.${withdrawStatus.value}`, { locale: $lang });
        if (withdrawStatus.label !== translated) withdrawStatus = { ...withdrawStatus, label: translated };
    }

    let dateFilter: DateRange = {
        start: toCalDate($page.url.searchParams.get("after") || ""),
        end: toCalDate($page.url.searchParams.get("before") || ""),
    }

    function dateFilterChange(d: DateRange) {
        dateFilter = d;
        triggerSearch();
    }

    function statusChange(s: Selected<string> | undefined) {
        withdrawStatus = s;

        triggerSearch();
    }


    // Every filter funnels through here, so the URL is the single source of
    // truth for the whole view and Back restores a coherent one.
    //
    // Only a change to one of the eight SERVER-side filter params re-runs the
    // chunked load (re-downloading the history) — SvelteKit re-runs `load`
    // only for the params it actually read, and `+page.ts` reads exactly
    // those eight through `withdrawalFiltersFromUrl`. Changing `search` or
    // `page` alone therefore navigates without refetching a single row.
    // Text-input filters still funnel through the debounced wrapper so a
    // keystroke burst costs one navigation, not one per key.
    let searchDebounce: ReturnType<typeof setTimeout> | undefined;
    function debouncedTriggerSearch() {
        clearTimeout(searchDebounce);
        // The handle doubles as the "user is mid-keystroke" flag afterNavigate
        // reads, so it must be cleared once it fires, not just on the next
        // keystroke — a stale handle would freeze URL→input syncing for good.
        searchDebounce = setTimeout(() => {
            searchDebounce = undefined;
            triggerSearch();
        }, 400);
    }

    function triggerSearch() {
        clearTimeout(searchDebounce);
        searchDebounce = undefined;
        currentPage = 1;
        // Filter/sort changes reset to page 1 — the page param is only
        // meaningful when the result set is otherwise unchanged.
        // URLSearchParams so free-text values with &, #, + or spaces can't
        // corrupt the query string.
        const q = new URLSearchParams({
            status: withdrawStatus?.value ?? "",
            userId,
            completerId,
            id: withdrawalId,
            min: min ?? "",
            max: max ?? "",
            after: toZincDate(dateFilter.start),
            before: toZincDate(dateFilter.end),
            search: searchTerm,
            page: "1",
        });
        goto(`?${q.toString()}`,
            {
                keepFocus: true,
                noScroll: true,
            });
    }

    // Page clicks navigate, so the page lands in the URL and Back returns to
    // the page you came from instead of jumping to the start (#F102).
    //
    // This does NOT re-download the history, even though the load is the
    // expensive chunked one. `+page.ts` reads the URL only through
    // `withdrawalFiltersFromUrl(url)`, which touches exactly the eight
    // server-side filter params via `searchParams.get()`. SvelteKit tracks
    // `load`'s param reads individually and re-runs it only when a param it
    // actually read has changed, so a navigation that moves `page` alone
    // reuses the loaded rows and re-runs nothing. That fine-grained tracking
    // is the whole reason this can be a real navigation — keep the loader
    // off `page` (and off bare `url.href`/`url.search`, which would opt it
    // back into tracking the entire URL).
    //
    // Copy the existing params rather than rebuilding them, so filters and
    // search survive paging.
    function gotoPage(p: number) {
        const params = new URLSearchParams($page.url.searchParams);
        params.set("page", `${Number.isFinite(p) && p > 0 ? Math.floor(p) : 1}`);
        // Default goto() PUSHES a history entry — that is what Back walks.
        goto(`?${params.toString()}`, {
            keepFocus: true,
            noScroll: true,
        });
    }

    const session: any = $page.data.session;

    // Case-insensitive on purpose: zinc gates the export with
    // GuardRoleIgnoreCaseAsync because Descope role casing is not guaranteed.
    // An exact match here would hide the button from an owner the API would
    // happily serve.
    $: isOwner = session?.roles?.some((r: string) => r.toLowerCase() === "owner") ?? false;

    // Filters for the CSV export, read off the URL rather than the live input
    // state so the download matches the applied server-side result set (the
    // text inputs are debounced — the URL is the applied set). Same casing as
    // the `vWithdrawalDetail` call in `+page.ts`, minus Limit/Skip.
    //
    // `search` is deliberately absent: it is a client-only filter over rows
    // the load already returned, and the endpoint has no equivalent — the
    // export covers the server-side filtered set.
    $: exportFilters = withdrawalFiltersFromUrl($page.url);

</script>

<div class="flex flex-col">
    <div class="border-b bg-muted ">
        <div class="flex justify-center sm:justify-between gap-4 flex-wrap py-8 items-center text-foreground max-w-[1200px] w-11/12 mx-auto">

            <div class="text-3xl lg:text-4xl">
                {$_('withdrawals.list.title', { locale: $lang })}

            </div>
            <div class="flex flex-col justify-center items-center font-light">
                <div class="text-2xl">{formatMoney($page.data.user?.wallet?.usable ?? 0, $lang)}</div>
                <div>{$_('fields.balance', { locale: $lang })}</div>
            </div>
        </div>

    </div>
    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">
        <!-- Free-text client search across the rows the load returned:
             matches withdrawal id, PayNow number, payout confirmation
             number, or the row's amount as a string. Username / email
             are not searchable here because the list endpoint does not
             surface them on the row. -->
        <Input placeholder={$_('withdrawals.list.searchPlaceholder', { locale: $lang })} bind:value={searchTerm} on:input={debouncedTriggerSearch}/>
        {#if session?.roles?.includes("admin")}
            <Input placeholder={$_('withdrawals.list.filterById', { locale: $lang })} bind:value={withdrawalId} on:input={debouncedTriggerSearch}/>
            <Input placeholder={$_('withdrawals.list.filterByUserId', { locale: $lang })} bind:value={userId} on:input={debouncedTriggerSearch}/>
            <Input placeholder={$_('withdrawals.list.filterByCompleterId', { locale: $lang })} bind:value={completerId} on:input={debouncedTriggerSearch}/>
        {/if}
        <div class="flex flex-wrap gap-4 w-full">
            <DateRangePicker
                    onValueChange={dateFilterChange}
                    bind:value={dateFilter}
                    placeholder={$_('withdrawals.list.filterByDateRange', { locale: $lang })}
                    numberOfMonths={1}
            />
            <Select.Root bind:selected={withdrawStatus} onSelectedChange={statusChange}>
                <Select.Trigger class="w-full lg:max-w-60">
                    <ArrowLeftRight class="mr-2 h-4 w-4"/>
                    <Select.Value placeholder={$_('fields.status', { locale: $lang })}/>
                </Select.Trigger>
                <Select.Content>
                    <Select.Item value="">{$_('withdrawals.list.statusNone', { locale: $lang })}</Select.Item>
                    {#each Object.entries(WITHDRAWAL_STATUS) as [label, val]}
                        <Select.Item value={val.value}>{$_(`withdrawals.status.${val.value}`, { locale: $lang })}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>

            {#if $page.data.user}
                <CreateWithdrawal
                        userId={$page.data.user.principal.id}
                        wallet={$page.data.user.wallet}
                />
            {/if}

            <!-- Ledger CSV for tax reporting. The endpoint is owner-only, so
                 the button only exists for owners — everyone else would just
                 get a 403. Matched case-insensitively to agree with zinc, whose
                 own guard notes that Descope role casing is not guaranteed; an
                 exact match would silently hide the button from a legitimate
                 owner carrying "Owner", and nobody reports a button they cannot
                 see. -->
            {#if isOwner}
                <div class="flex flex-col gap-1 w-full lg:max-w-60">
                    <ExportWithdrawals filters={exportFilters}/>
                    {#if searchTerm.trim() !== ""}
                        <p class="text-xs text-muted-foreground">
                            {$_('withdrawals.export.searchHint', { locale: $lang })}
                        </p>
                    {/if}
                </div>
            {/if}
        </div>

        {#await withdrawals}
            <Loader/>
        {:then ws}
            <!-- Apply client-side search, then slice the visible page.
                 Pagination is 20/page — matches the bookings list convention. -->
            {@const filtered = ws.filter(w => withdrawalMatchesSearch(w, searchTerm))}
            {@const totalFilteredRows = filtered.length}
            {@const maxPage = computeTotalPages(filtered, WITHDRAWAL_PAGE_SIZE)}
            <!-- Clamp the URL-driven page to the now-computed total so an
                 out-of-range deep link lands on the last page, not an
                 empty one. -->
            {@const safePage = Math.min(currentPage, maxPage)}
            {@const pageRows = paginateWithdrawals(filtered, safePage, WITHDRAWAL_PAGE_SIZE)}
            <Page notFoundMessage={$_('withdrawals.list.notFound', { locale: $lang })} empty={filtered.length === 0}>
                <div class="flex flex-col gap-4 my-4">
                    {#each pageRows as w}
                        <Card.Root>
                            <Card.Header>
                                <Card.Title>
                                    {#if isCardRefund(w.record)}
                                        {$_(cardRefundTitleI18nKey(w.status.status ?? 'Pending'), {
                                            locale: $lang,
                                            values: { amount: formatMoney(w.record.amount, $lang) }
                                        })}
                                    {:else}
                                        {$_('withdrawals.card.amountToPayNow', { locale: $lang, values: { amount: formatMoney(w.record.amount, $lang), payNowNumber: w.record.payNowNumber } })}
                                    {/if}
                                </Card.Title>
                                <div class="flex justify-between py-2">
                                    <Card.Description>{formatDateTime(w.createAt, $lang)}</Card.Description>
                                    <Badge class="{WITHDRAWAL_STATUS_BADGE[w.status.status ?? ''].color}">{$_(`withdrawals.status.${w.status.status ?? ''}`, { locale: $lang })}</Badge>
                                </div>
                                {#if w.payout}
                                    <WithdrawalPayoutDetails payout={w.payout} compact/>
                                {/if}

                            </Card.Header>
                            <Card.Content>

                                <div class="flex flex-wrap justify-between gap-4">
                                    <div class="flex flex-1 flex-wrap gap-4">
                                        {#if w.status.status?.toLowerCase() == "pending"}
                                            {#if session?.roles?.includes("admin") ?? false}
                                                <!-- auto-approve is card-refund only until Airwallex
                                                     PayNow payouts go live (see Withdrawal.svelte) -->
                                                {#if isCardRefund(w.record)}
                                                    <ApproveWithdrawal withdrawal={w}/>
                                                {/if}
                                                <CompleteWithdrawalManual withdrawal={w}/>
                                                <RejectWithdrawal withdrawal={w}/>
                                            {/if}
                                            {#if $page.data.user}
                                                <CancelWithdrawal withdrawal={w}
                                                                  userId={$page.data.user.principal.id}/>
                                            {/if}
                                        {/if}
                                    </div>
                                    <Button href="/withdrawals/{w.id}" variant="ghost" class="w-full lg:max-w-40">
                                        {$_('withdrawals.card.viewDetails', { locale: $lang })}
                                    </Button>

                                </div>

                            </Card.Content>
                        </Card.Root>
                    {/each}
                </div>
            </Page>
            <!-- Prev / next pagination, only meaningful when the filtered
                 result set spans more than one page. -->
            {#if totalFilteredRows > WITHDRAWAL_PAGE_SIZE}
                <div class="flex flex-col items-center gap-2 my-6">
                    <div class="text-sm text-muted-foreground">
                        {$_('withdrawals.list.pageInfo', {
                            locale: $lang,
                            values: {
                                from: totalFilteredRows === 0 ? 0 : (safePage - 1) * WITHDRAWAL_PAGE_SIZE + 1,
                                to: Math.min(safePage * WITHDRAWAL_PAGE_SIZE, totalFilteredRows),
                                total: totalFilteredRows,
                            }
                        })}
                    </div>
                    <div class="flex justify-center items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" disabled={safePage <= 1} on:click={() => gotoPage(safePage - 1)}>
                            {$_('withdrawals.list.prevPage', { locale: $lang })}
                        </Button>
                        <Button variant="outline" size="sm" disabled={safePage >= maxPage} on:click={() => gotoPage(safePage + 1)}>
                            {$_('withdrawals.list.nextPage', { locale: $lang })}
                        </Button>
                    </div>
                </div>
            {/if}
        {/await}
    </div>
</div>
