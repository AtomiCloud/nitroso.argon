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
    import {isCardRefund} from "$lib/components/entities/Withdrawals/withdrawal";
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


    function triggerSearch() {
        const v = withdrawStatus?.value ?? ""
        goto(`?status=${v}&userId=${userId}&completerId=${completerId}&id=${withdrawalId}&min=${min ?? ''}&max=${max ?? ''}&after=${toZincDate(dateFilter.start)}&before=${toZincDate(dateFilter.end)}`,
            {
                keepFocus: true,
                noScroll: true,
            });
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
        {#if session?.roles?.includes("admin")}
            <Input placeholder={$_('withdrawals.list.filterById', { locale: $lang })} bind:value={withdrawalId} on:input={triggerSearch}/>
            <Input placeholder={$_('withdrawals.list.filterByUserId', { locale: $lang })} bind:value={userId} on:input={triggerSearch}/>
            <Input placeholder={$_('withdrawals.list.filterByCompleterId', { locale: $lang })} bind:value={completerId} on:input={triggerSearch}/>
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
            <Page notFoundMessage={$_('withdrawals.list.notFound', { locale: $lang })} empty={ws.length === 0}>
                <div class="flex flex-col gap-4 my-4">
                    {#each ws as w}
                        <Card.Root>
                            <Card.Header>
                                <Card.Title>
                                    {#if isCardRefund(w.record)}
                                        {$_('withdrawals.card.amountToCard', { locale: $lang, values: { amount: formatMoney(w.record.amount, $lang) } })}
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
                                                <ApproveWithdrawal withdrawal={w}/>
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
        {/await}
    </div>
</div>
