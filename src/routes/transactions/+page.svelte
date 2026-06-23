<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    import type {TransactionPrincipalRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../errors/problem_details";
    import {Res} from "$lib/core/result";
    import {problem} from "../../store";
    import Loader from "$lib/components/complex/loader.svelte";
    import {Input} from "$lib/components/ui/input";
    import {page} from "$app/stores";
    import {goto} from "$app/navigation";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatDateTime} from "$lib/i18n";

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
    import {TRANSACTION_TYPES} from "./transaction_type.js";
    import {ArrowLeftRight} from "lucide-svelte";
    import type {PageData} from "./$types";
    import {format, parse} from "date-fns";

    export let data: PageData;
    const session: any = $page.data.session;

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

    $: transactions = (Res.fromSerial<TransactionPrincipalRes[], ProblemDetails>(data.result)
        .match({
            ok: (a: TransactionPrincipalRes[]): TransactionPrincipalRes[] => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e);
                return null as never;
            }
        }) satisfies Promise<TransactionPrincipalRes[]>)

    let searchTerm = $page.url.searchParams.get('search') || "";
    let userId = $page.url.searchParams.get('userId') || "";

    let dateFilter: DateRange = {
        start: toCalDate($page.url.searchParams.get("after") || ""),
        end: toCalDate($page.url.searchParams.get("before") || ""),
    }

    let transactionType: Selected<string> | undefined = TRANSACTION_TYPES[$page.url.searchParams.get('transactionType') || ""];

    // Keep the closed-trigger label localized for deep-linked / language-switched
    // state; the menu items are already translated but `Selected.label` defaults
    // to the English constant.
    $: if (transactionType?.value) {
        const translated = $_(`status.transactionType.${transactionType.value}`, { locale: $lang });
        if (transactionType.label !== translated) transactionType = { ...transactionType, label: translated };
    }

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

<div class="flex flex-col">
    <div class="border-b bg-muted ">
        <div class="flex justify-center sm:justify-between gap-4 flex-wrap py-8 items-center text-foreground max-w-[1200px] w-11/12 mx-auto">

            <div class="text-3xl lg:text-4xl">
                {$_('transactions.list.title', { locale: $lang })}

            </div>
            <div class="flex flex-col justify-center items-center font-light">
                <div class="text-2xl">{formatMoney($page.data.user?.wallet?.usable ?? 0, $lang)}</div>
                <div>{$_('fields.balance', { locale: $lang })}</div>
            </div>
        </div>

    </div>
    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">
        <Input placeholder={$_('transactions.list.searchPlaceholder', { locale: $lang })} bind:value={searchTerm} on:input={triggerSearch}/>
        {#if session?.roles?.includes("admin")}
            <Input placeholder={$_('transactions.list.userIdPlaceholder', { locale: $lang })} bind:value={userId} on:input={triggerSearch}/>
        {/if}
        <div class="flex flex-wrap gap-4 w-full">
            <DateRangePicker
                    onValueChange={dateFilterChange}
                    bind:value={dateFilter}
                    placeholder={$_('transactions.list.dateRangePlaceholder', { locale: $lang })}
                    numberOfMonths={1}
            />
            <Select.Root bind:selected={transactionType} onSelectedChange={transactionTypeChange}>
                <Select.Trigger class="w-full lg:max-w-60">
                    <ArrowLeftRight class="mr-2 h-4 w-4"/>
                    <Select.Value placeholder={$_('transactions.list.typePlaceholder', { locale: $lang })}/>
                </Select.Trigger>
                <Select.Content>
                    <Select.Item value="">{$_('transactions.list.typeNone', { locale: $lang })}</Select.Item>
                    {#each Object.entries(TRANSACTION_TYPES) as [, val]}
                        <Select.Item value={val.value}>{$_(`status.transactionType.${val.value}`, { locale: $lang })}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>

        </div>

        {#await transactions}
            <Loader/>
        {:then txs}
            <Page notFoundMessage={$_('transactions.list.emptyState', { locale: $lang })} empty={txs.length === 0}>

                <div class="flex flex-col gap-4 my-4">
                    <Table.Root>
                        <Table.Header>
                            <Table.Row>
                                <Table.Head>{$_('fields.name', { locale: $lang })}</Table.Head>
                                <Table.Head>{$_('transactions.list.colType', { locale: $lang })}</Table.Head>
                                <Table.Head>{$_('fields.date', { locale: $lang })}</Table.Head>
                                <Table.Head>{$_('fields.amount', { locale: $lang })}</Table.Head>
                                <Table.Head>{$_('transactions.list.colFrom', { locale: $lang })}</Table.Head>
                                <Table.Head>{$_('transactions.list.colTo', { locale: $lang })}</Table.Head>

                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each txs as tx}


                                <Table.Row on:click={() => goto(`/transactions/${tx.id}`)}>
                                    <Table.Cell>{tx.name}</Table.Cell>
                                    <Table.Cell>{$_(`status.transactionType.${tx.transactionType}`, { locale: $lang })}</Table.Cell>
                                    <Table.Cell>{formatDateTime(tx.createdAt, $lang)}</Table.Cell>
                                    <Table.Cell>{formatMoney(tx.amount, $lang)}</Table.Cell>
                                    <Table.Cell>{tx.from}</Table.Cell>
                                    <Table.Cell>{tx.to}</Table.Cell>

                                </Table.Row>
                            {/each}
                        </Table.Body>
                    </Table.Root>
                </div>
            </Page>
        {/await}
    </div>
</div>
