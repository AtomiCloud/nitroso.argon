<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    import type {BookingPrincipalRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../errors/problem_details";
    import {Res} from "$lib/core/result";
    import {problem} from "../../store";
    import Loader from "$lib/components/complex/loader.svelte";
    import {Input} from "$lib/components/ui/input";
    import {page} from "$app/stores";
    import {goto} from "$app/navigation";

    //@ts-ignore
    import * as Select from "$lib/components/ui/select";
    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    //@ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    import type {Selected} from "bits-ui";
    import {CalendarDate, type DateValue, getLocalTimeZone} from "@internationalized/date";

    import {CalendarIcon, FilePieChart} from "lucide-svelte";
    import type {PageData} from "./$types";
    import {tick} from "svelte";
    import {cn} from "$lib/utils";
    import {Calendar} from "$lib/components/ui/calendar";
    import {Button} from "$lib/components/ui/button";
    import {BOOKING_STATUS} from "./book_status";
    import BookingRow from "$lib/components/entities/Bookings/BookingRow.svelte";
    import {format, parse} from "date-fns";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatCalendarDate} from "$lib/i18n";

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

    $: bookings = (Res.fromSerial<BookingPrincipalRes[], ProblemDetails>(data.result)
        .match({
            ok: (a: BookingPrincipalRes[]): BookingPrincipalRes[] => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e);
                return null as never;
            }
        }) satisfies Promise<BookingPrincipalRes[]>)

    let userId = $page.url.searchParams.get("userId") ?? "";

    let date = $page.url.searchParams.get("date") ?? "";
    let direction = $page.url.searchParams.get("direction") ?? "";
    let status = $page.url.searchParams.get("status") ?? "";
    let time = $page.url.searchParams.get("time") ?? "";


    let bookingStatus: Selected<string> | undefined = BOOKING_STATUS[status || ""];

    // The dropdown items render translated text, but the closed trigger shows
    // `Selected.label`, which for a deep-linked initial value (e.g.
    // `?status=Completed`) comes from the English constant. Keep that label in
    // sync with the active locale so non-English locales never leak English.
    $: if (bookingStatus?.value) {
        const translated = $_(`status.booking.${bookingStatus.value}`, { locale: $lang });
        if (bookingStatus.label !== translated) bookingStatus = { ...bookingStatus, label: translated };
    }

    let bindDirection: string = direction;
    let bindDate: DateValue = toCalDate(date);


    function bookingStatusChange(t: Selected<string> | undefined) {
        bookingStatus = t;
        triggerSearch();
    }

    async function dateChange() {
        await tick();
        triggerSearch();
    }

    async function directionChange() {

        await tick();
        triggerSearch();
    }

    function triggerSearch() {
        const status = bookingStatus?.value ?? "";
        const d = toZincDate(bindDate);
        const dir = bindDirection ?? ""
        goto(`?userId=${userId}&time=${time}&status=${status}&date=${d}&direction=${dir}`,
            {
                keepFocus: true,
                noScroll: true,
            }
        );
    }

    const session: any = $page.data.session;

</script>

<div class="flex flex-col">
    <div class="border-b bg-muted ">
        <div class="flex justify-center sm:justify-between gap-4 flex-wrap py-8 items-center text-foreground max-w-[1200px] w-11/12 mx-auto">

            <div class="text-3xl lg:text-4xl">
                {$_('bookings.list.title', { locale: $lang })}

            </div>
            <div class="flex flex-col justify-center items-center font-light">
                <div class="text-2xl">{formatMoney($page.data.user?.wallet?.usable ?? 0, $lang)}</div>
                <div>{$_('fields.balance', { locale: $lang })}</div>
            </div>
        </div>

    </div>
    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">

        {#if session?.roles?.includes("admin")}
            <Input class="w-full"
                   placeholder={$_('bookings.list.filterByUserId', { locale: $lang })} bind:value={userId} on:input={triggerSearch}/>
        {/if}
        <div class="flex gap-4 flex-wrap justify-start">
            <Popover.Root>
                <Popover.Trigger asChild let:builder>
                    <Button variant="outline"
                            class={cn("w-full lg:max-w-60 justify-start text-left font-normal",!bindDate && "text-muted-foreground")}
                            builders={[builder]}>
                        <CalendarIcon class="mr-2 h-4 w-4"/>
                        {bindDate ? formatCalendarDate(bindDate.toDate(getLocalTimeZone()), $lang, {dateStyle: "long"}) : $_('bookings.list.selectDate', { locale: $lang })}
                    </Button>
                </Popover.Trigger>
                <Popover.Content class="w-auto p-0" align="start">
                    <Calendar bind:value={bindDate} onValueChange={dateChange}/>
                </Popover.Content>
            </Popover.Root>
            <Select.Root bind:selected={bookingStatus} onSelectedChange={bookingStatusChange}>
                <Select.Trigger class="w-full lg:max-w-60">
                    <FilePieChart class="mr-2 h-4 w-4"/>
                    <Select.Value placeholder={$_('fields.status', { locale: $lang })}/>
                </Select.Trigger>
                <Select.Content>
                    <Select.Item value="">{$_('bookings.list.none', { locale: $lang })}</Select.Item>
                    {#each Object.entries(BOOKING_STATUS) as [, val]}
                        <Select.Item value={val.value}>{$_(`status.booking.${val.value}`, { locale: $lang })}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
            <ToggleGroup.Root type="single" bind:value={bindDirection} class="w-full lg:max-w-80"
                              onValueChange={directionChange}>
                <ToggleGroup.Item value="WToJ" aria-label={$_('bookings.list.woodlandsToJbSentral', { locale: $lang })}>
                    {$_('bookings.list.woodlandsToJb', { locale: $lang })}
                </ToggleGroup.Item>
                <ToggleGroup.Item value="JToW" aria-label={$_('bookings.list.jbSentralToWoodlands', { locale: $lang })}>
                    {$_('bookings.list.jbToWoodlands', { locale: $lang })}
                </ToggleGroup.Item>
            </ToggleGroup.Root>
        </div>

        {#await bookings}
            <Loader/>
        {:then bs}
            <Page notFoundMessage={$_('bookings.list.empty', { locale: $lang })} empty={bs.length === 0}>
                {#each bs as b}
                    <BookingRow {b}/>
                {/each}
            </Page>
        {/await}
    </div>
</div>
