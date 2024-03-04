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
    import {CalendarDate, DateFormatter, type DateValue, getLocalTimeZone} from "@internationalized/date";

    import {CalendarIcon, FilePieChart} from "lucide-svelte";
    import type {PageData} from "./$types";
    import {tick} from "svelte";
    import {cn} from "$lib/utils";
    import {Calendar} from "$lib/components/ui/calendar";
    import {Button} from "$lib/components/ui/button";
    import {BOOKING_STATUS} from "./book_status";
    import BookingRow from "$lib/components/entities/Bookings/BookingRow.svelte";
    import {format, parse} from "date-fns";

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

    let bindDirection: string = direction;
    let bindDate: DateValue = toCalDate(date);

    const df = new DateFormatter("en-US", {
        dateStyle: "long"
    });

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

</script>

<div class="flex flex-col">
    <div class="border-b bg-muted ">
        <div class="flex justify-center sm:justify-between gap-4 flex-wrap py-8 items-center text-foreground max-w-[1200px] w-11/12 mx-auto">

            <div class="text-3xl lg:text-4xl">
                Bookings

            </div>
            <div class="flex flex-col justify-center items-center font-light">
                <div class="text-2xl">S${$page.data.user?.wallet?.usable?.toFixed(2) ?? "0.00" }</div>
                <div>Balance</div>
            </div>
        </div>

    </div>
    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">

        {#if $page.data.session?.roles?.includes("admin")}
            <Input class="w-full"
                   placeholder="Filter by user ID..." bind:value={userId} on:input={triggerSearch}/>
        {/if}
        <div class="flex gap-4 flex-wrap justify-start">
            <Popover.Root>
                <Popover.Trigger asChild let:builder>
                    <Button variant="outline"
                            class={cn("w-full lg:max-w-60 justify-start text-left font-normal",!bindDate && "text-muted-foreground")}
                            builders={[builder]}>
                        <CalendarIcon class="mr-2 h-4 w-4"/>
                        {bindDate ? df.format(bindDate.toDate(getLocalTimeZone())) : "Select a date"}
                    </Button>
                </Popover.Trigger>
                <Popover.Content class="w-auto p-0" align="start">
                    <Calendar bind:value={bindDate} onValueChange={dateChange}/>
                </Popover.Content>
            </Popover.Root>
            <Select.Root bind:selected={bookingStatus} onSelectedChange={bookingStatusChange}>
                <Select.Trigger class="w-full lg:max-w-60">
                    <FilePieChart class="mr-2 h-4 w-4"/>
                    <Select.Value placeholder="Status"/>
                </Select.Trigger>
                <Select.Content>
                    <Select.Item value="">None</Select.Item>
                    {#each Object.entries(BOOKING_STATUS) as [, val]}
                        <Select.Item value={val.value}>{val.label}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
            <ToggleGroup.Root type="single" bind:value={bindDirection} class="w-full lg:max-w-80"
                              onValueChange={directionChange}>
                <ToggleGroup.Item value="WToJ" aria-label="Woodlands to JB Sentral">
                    Woodlands to JB
                </ToggleGroup.Item>
                <ToggleGroup.Item value="JToW" aria-label="JB Sentral to Woodlands">
                    JB to Woodlands
                </ToggleGroup.Item>
            </ToggleGroup.Root>
        </div>

        {#await bookings}
            <Loader/>
        {:then bs}
            <Page notFoundMessage="Not bookings found" empty={bs.length === 0}>
                {#each bs as b}
                    <BookingRow {b}/>
                {/each}
            </Page>
        {/await}
    </div>
</div>
