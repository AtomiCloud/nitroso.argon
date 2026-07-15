<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    import type {WithdrawalPrincipalRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../errors/problem_details";
    import {Res} from "$lib/core/result";
    import {problem} from "../../store";
    import Loader from "$lib/components/complex/loader.svelte";
    import {Input} from "$lib/components/ui/input";
    import {page} from "$app/stores";
    import {goto} from "$app/navigation";

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
    import {Badge} from "$lib/components/ui/badge";
    import ApproveWithdrawal from "$lib/components/entities/Withdrawals/ApproveWithdrawal.svelte";
    import CompleteWithdrawalManual from "$lib/components/entities/Withdrawals/CompleteWithdrawalManual.svelte";
    import RejectWithdrawal from "$lib/components/entities/Withdrawals/RejectWithdrawal.svelte";
    import CancelWithdrawal from "$lib/components/entities/Withdrawals/CancelWithdrawal.svelte";
    import WithdrawalPayoutDetails from "$lib/components/entities/Withdrawals/WithdrawalPayoutDetails.svelte";
    import {isCardRefund, cardRefundTitleI18nKey} from "$lib/components/entities/Withdrawals/withdrawal";
    import {
        WITHDRAWAL_PAGE_SIZE,
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
    // returned by the (server-side-filtered) load; pagination is purely
    // client-side at WITHDRAWAL_PAGE_SIZE per page.
    let searchTerm = $page.url.searchParams.get("search") ?? "";
    const rawPage = parseInt($page.url.searchParams.get("page") ?? "1", 10);
    let currentPage: number = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

    let status = $page.url.searchParams.get("status") ?? "";

    let withdrawStatus: Selected<string> | undefined = WITHDRAWAL_STATUS[status];

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


    // SERVER-side filter changes only: navigating re-runs the chunked load
    // (the whole history re-downloads), so free-text search and pagination
    // must never come through here — they are pure client state below.
    // Text-input filters funnel through the debounced wrapper so a keystroke
    // burst costs one reload, not one per key.
    let searchDebounce: ReturnType<typeof setTimeout> | undefined;
    function debouncedTriggerSearch() {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(triggerSearch, 400);
    }

    function triggerSearch() {
        clearTimeout(searchDebounce);
        currentPage = 1;
        const v = withdrawStatus?.value ?? ""
        // Filter/sort changes reset to page 1 — the page param is only
        // meaningful when the result set is otherwise unchanged.
        goto(`?status=${v}&userId=${userId}&completerId=${completerId}&id=${withdrawalId}&min=${min ?? ''}&max=${max ?? ''}&after=${toZincDate(dateFilter.start)}&before=${toZincDate(dateFilter.end)}&search=${searchTerm}&page=1`,
            {
                keepFocus: true,
                noScroll: true,
            });
    }

    // Pagination is pure client state: navigating would re-run the chunked
    // load (re-downloading the whole history) AND this component would keep
    // its stale init-time page. Deep links (?page=N) still seed the initial
    // value above; the URL simply no longer tracks subsequent clicks.
    function gotoPage(p: number) {
        currentPage = Number.isFinite(p) && p > 0 ? Math.floor(p) : 1;
    }

    const session: any = $page.data.session;

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
        <Input placeholder={$_('withdrawals.list.searchPlaceholder', { locale: $lang })} bind:value={searchTerm} on:input={() => (currentPage = 1)}/>
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
