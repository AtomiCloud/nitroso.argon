<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    import type {SchedulePrincipalRes, TransactionPrincipalRes} from "$lib/api/core/data-contracts";
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
    import DateRangePicker from "$lib/components/complex/DateRangePicker.svelte";
    import type {DateRange, Selected} from "bits-ui";
    import {CalendarDate, type DateValue} from "@internationalized/date";
    import {ArrowLeftRight} from "lucide-svelte";
    import type {PageData} from "./$types";
    import {TRANSACTION_TYPES} from "../transactions/transaction_type";

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

    $: transactions = (Res.fromSerial<string[], ProblemDetails[]>(data.result)
        .match({
            ok: (a: string[]): string[] => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e[0]);
                return null as never;
            }
        }) satisfies Promise<string[]>)

    let searchTerm = $page.url.searchParams.get('search') || "";
    let userId = $page.url.searchParams.get('userId') || "";

    let dateFilter: DateRange = {
        start: toCalDate($page.url.searchParams.get("after") || ""),
        end: toCalDate($page.url.searchParams.get("before") || ""),
    }

    let transactionType: Selected<string> | undefined = TRANSACTION_TYPES[$page.url.searchParams.get('transactionType') || ""];

    function dateFilterChange(d: DateRange) {
        dateFilter = d;
        triggerSearch();
    }

    function transactionTypeChange(t: Selected<string> | undefined) {
        transactionType = t;
        triggerSearch();
    }


    function triggerSearch() {
        const v = transactionType?.value ?? ""
        goto(`?transactionType=${v}&search=${searchTerm}&userId=${userId}&before=${toZincDate(dateFilter.end)}&after=${toZincDate(dateFilter.start)}`,
            {
                keepFocus: true,
                noScroll: true,
            }
        );
    }

</script>

<Page notFoundMessage="Main page cannot be found">
    <div class="flex flex-col">
        <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">
            <Input placeholder="Search for transactions..." bind:value={searchTerm} on:input={triggerSearch}/>
            {#if $page.data.session?.roles?.includes("admin")}
                <Input placeholder="Filter by user ID..." bind:value={userId} on:input={triggerSearch}/>
            {/if}
            <div class="flex flex-wrap gap-4 w-full">
                <DateRangePicker
                        onValueChange={dateFilterChange}
                        bind:value={dateFilter}
                        placeholder="Filter by date range"
                        numberOfMonths={1}
                />
                <Select.Root bind:selected={transactionType} onSelectedChange={transactionTypeChange}>
                    <Select.Trigger class="w-full lg:max-w-60">
                        <ArrowLeftRight class="mr-2 h-4 w-4"/>
                        <Select.Value placeholder="Transaction Type"/>
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="">None</Select.Item>
                        {#each Object.entries(TRANSACTION_TYPES) as [label, v]}
                            <Select.Item value={v?.value}>{label}</Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>

            </div>

            {#await transactions}
                <Loader/>
            {:then txs}
                <div class="flex flex-col gap-4 my-4">
                    <Table.Root>
                        <Table.Header>
                            <Table.Row>
                                <Table.Head>Name</Table.Head>
                                <Table.Head>Type</Table.Head>
                                <Table.Head>Date</Table.Head>
                                <Table.Head>Amount</Table.Head>
                                <Table.Head>From</Table.Head>
                                <Table.Head>To</Table.Head>

                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each txs as tx}


<!--                                    <Table.Row on:click={() => goto(`/transactions/${tx.id}`)}>-->
<!--                                        <Table.Cell>{tx.name}</Table.Cell>-->
<!--                                        <Table.Cell>{tx.transactionType}</Table.Cell>-->
<!--                                        <Table.Cell>{new Date(tx.createdAt).toLocaleString('en-us', {-->
<!--                                            dateStyle: "medium",-->
<!--                                            timeStyle: "medium",-->
<!--                                        })}</Table.Cell>-->
<!--                                        <Table.Cell>SGD {tx.amount.toFixed(2)}</Table.Cell>-->
<!--                                        <Table.Cell>{tx.from}</Table.Cell>-->
<!--                                        <Table.Cell>{tx.to}</Table.Cell>-->

<!--                                    </Table.Row>-->
                            {/each}
                        </Table.Body>
                    </Table.Root>
                </div>
            {/await}
        </div>
    </div>
</Page>
