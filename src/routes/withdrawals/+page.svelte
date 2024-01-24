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
    import CreateWithdrawal from "$lib/components/entities/CreateWithdrawal.svelte";
    import {Badge} from "$lib/components/ui/badge";
    import ApproveWithdrawal from "$lib/components/entities/ApproveWithdrawal.svelte";
    import RejectWithdrawal from "$lib/components/entities/RejectWithdrawal.svelte";
    import CancelWithdrawal from "$lib/components/entities/CancelWithdrawal.svelte";
    import type {PageData} from "./$types";

    export let data: PageData;

    // Util
    function toCalDate(s: string): DateValue | undefined {
        if (s == "") return undefined;
        const [d, m, y] = s.split("-");
        return new CalendarDate(parseInt(y), parseInt(m), parseInt(d));
    }

    function toZincDate(s?: DateValue): string {
        if (s == null) return "";
        const [y, m, d] = s.toString().split("-");
        return `${d}-${m}-${y}`;
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

</script>

<div class="flex flex-col">
    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">
        {#if $page.data.session?.roles?.includes("admin")}
            <Input placeholder="Filter by ID..." bind:value={withdrawalId} on:input={triggerSearch}/>
            <Input placeholder="Filter by user ID..." bind:value={userId} on:input={triggerSearch}/>
            <Input placeholder="Filter by completer ID..." bind:value={completerId} on:input={triggerSearch}/>
        {/if}
        <div class="flex flex-wrap gap-4 w-full">
            <DateRangePicker
                    onValueChange={dateFilterChange}
                    bind:value={dateFilter}
                    placeholder="Filter by date range"
                    numberOfMonths={1}
            />
            <Select.Root bind:selected={withdrawStatus} onSelectedChange={statusChange}>
                <Select.Trigger class="w-full lg:max-w-60">
                    <ArrowLeftRight class="mr-2 h-4 w-4"/>
                    <Select.Value placeholder="Status"/>
                </Select.Trigger>
                <Select.Content>
                    <Select.Item value="">None</Select.Item>
                    {#each Object.entries(WITHDRAWAL_STATUS) as [label, val]}
                        <Select.Item value={val.value}>{label}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>

            <CreateWithdrawal
                    userId={$page.data.user.principal.id}
                    wallet={$page.data.user.wallet}
            />
        </div>

        {#await withdrawals}
            <Loader/>
        {:then ws}
            <Page notFoundMessage="Withdrawals not found" empty={ws.length === 0}>
                <div class="flex flex-col gap-4 my-4">
                    {#each ws as w}
                        <Card.Root>
                            <Card.Header>
                                <Card.Title>S${w.record.amount.toFixed(2)} to
                                    PayNow {w.record.payNowNumber}</Card.Title>
                                <div class="flex justify-between py-2">
                                    <Card.Description>{new Date(w.createAt).toLocaleString(undefined, {
                                        dateStyle: 'medium',
                                        timeStyle: 'medium'
                                    })}</Card.Description>
                                    <Badge class="{WITHDRAWAL_STATUS_BADGE[w.status.status ?? ''].color}">{WITHDRAWAL_STATUS_BADGE[w.status.status ?? ""].display}</Badge>
                                </div>

                            </Card.Header>
                            <Card.Content>

                                <div class="flex flex-wrap justify-between gap-4">
                                    <div class="flex flex-1 flex-wrap gap-4">
                                        {#if w.status.status?.toLowerCase() == "pending"}
                                            {#if $page.data.session?.roles?.includes("admin") ?? false}
                                                <ApproveWithdrawal withdrawal={w}/>
                                                <RejectWithdrawal withdrawal={w}/>
                                            {/if}
                                            <CancelWithdrawal withdrawal={w}
                                                              userId={$page.data.user.principal.id}/>
                                        {/if}
                                    </div>
                                    <Button href="/withdrawals/{w.id}" variant="ghost" class="w-full lg:max-w-40">
                                        View Details
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
