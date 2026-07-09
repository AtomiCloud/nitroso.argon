<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    import type {BookingPrincipalRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../errors/problem_details";
    import {Res} from "$lib/core/result";
    import {api, problem} from "../../store";
    import {toResult} from "$lib/utility";
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

    import {ArrowUpDown, CalendarIcon, ChevronLeft, ChevronRight, Clock, FilePieChart} from "lucide-svelte";
    import type {PageData} from "./$types";
    import {onMount, tick} from "svelte";
    import {cn} from "$lib/utils";
    import {Calendar} from "$lib/components/ui/calendar";
    import {Button} from "$lib/components/ui/button";
    import {BOOKING_STATUS} from "./book_status";
    import BookingRow from "$lib/components/entities/Bookings/BookingRow.svelte";
    import {format, parse} from "date-fns";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatCalendarDate, formatClockTime, formatNumber} from "$lib/i18n";

    export let data: PageData;

    // Client-side-only fetches (count, timings) must not fire during SSR.
    let mounted = false;
    onMount(() => {
        mounted = true;
    });

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
    let sortBy = $page.url.searchParams.get("sortBy") ?? "";
    let passengerName = $page.url.searchParams.get("passengerName") ?? "";
    let passportNumber = $page.url.searchParams.get("passportNumber") ?? "";


    let bookingStatus: Selected<string> | undefined = BOOKING_STATUS[status || ""];

    // Sort options: '' (newest first, the server default) plus the zinc SortBy
    // values. Keyed by SortBy value → i18n key suffix.
    const BOOKING_SORT_KEYS: Record<string, string> = {
        "": "sortNewest",
        Timing: "sortTiming",
        PassengerName: "sortPassengerName",
        PassportNumber: "sortPassportNumber",
        BuyTime: "sortBuyTime",
        FulfilTime: "sortFulfilTime",
    };

    let bookingSort: Selected<string> | undefined = sortBy === "" ? undefined : {value: sortBy, label: sortBy};

    // Same closed-trigger localization treatment as `bookingStatus` below.
    $: if (bookingSort?.value) {
        const translated = $_(`bookings.list.${BOOKING_SORT_KEYS[bookingSort.value] ?? 'sortNewest'}`, { locale: $lang });
        if (bookingSort.label !== translated) bookingSort = { ...bookingSort, label: translated };
    }

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

    // Departure-time filter, dependent on the selected direction: options come
    // from the timings API (GET Timing/{Direction}), so only real schedule
    // slots are offered.
    let bookingTime: Selected<string> | undefined = time === "" ? undefined : {value: time, label: time};
    let timings: string[] = [];
    let timingsFor = ""; // direction the loaded `timings` belong to

    // Same closed-trigger localization treatment as `bookingStatus` below.
    $: if (bookingTime?.value) {
        const translated = formatClockTime(bookingTime.value, $lang);
        if (bookingTime.label !== translated) bookingTime = { ...bookingTime, label: translated };
    }

    async function loadTimings(dir: string) {
        timingsFor = dir;
        await toResult(() => $api.vTimingDetail(dir, "1"),
            $_('bookings.list.timesLoadError', { locale: $lang })).match({
            ok: (t) => {
                // ignore stale responses after a direction switch mid-flight
                if (timingsFor === dir) timings = t.principal.timings ?? [];
            },
            err: (e) => {
                console.error(e);
            }
        });
    }

    $: if (mounted && bindDirection && bindDirection !== timingsFor) loadTimings(bindDirection);

    function bookingStatusChange(t: Selected<string> | undefined) {
        bookingStatus = t;
        triggerSearch();
    }

    function bookingSortChange(t: Selected<string> | undefined) {
        bookingSort = t;
        triggerSearch();
    }

    function bookingTimeChange(t: Selected<string> | undefined) {
        bookingTime = t;
        time = t?.value ?? "";
        triggerSearch();
    }

    async function dateChange() {
        await tick();
        triggerSearch();
    }

    async function directionChange() {
        // A timeslot only makes sense within one direction; drop it on switch.
        if (time !== "") {
            time = "";
            bookingTime = undefined;
        }
        if (!bindDirection) {
            timings = [];
            timingsFor = "";
        }
        await tick();
        triggerSearch();
    }

    // Any filter/sort change resets to page 1 (no `page` param).
    function triggerSearch() {
        const params = new URLSearchParams();
        params.set("userId", userId);
        params.set("time", time);
        params.set("status", bookingStatus?.value ?? "");
        params.set("date", toZincDate(bindDate));
        params.set("direction", bindDirection ?? "");
        params.set("sortBy", bookingSort?.value ?? "");
        params.set("passengerName", passengerName);
        params.set("passportNumber", passportNumber);
        goto(`?${params.toString()}`,
            {
                keepFocus: true,
                noScroll: true,
            }
        );
    }

    // Page navigation preserves every other query param as-is.
    function gotoPage(p: number) {
        const params = new URLSearchParams($page.url.searchParams);
        params.set("page", `${p}`);
        goto(`?${params.toString()}`, {
            keepFocus: true,
            noScroll: true,
        });
    }

    // ---- result count (drives "Page X of Y", numbered pages and page jump) ----

    // Keep in sync with PAGE_SIZE in ./+page.ts (SvelteKit forbids extra
    // exports from +page.ts, so the constant is duplicated here).
    const PAGE_SIZE = 20;

    let total: number | null = null;
    let countedSig = ""; // filter signature the current `total` belongs to

    // Signature of everything that affects the result count: the search
    // filters, but NOT the page number or sort — flipping pages or re-sorting
    // must not refetch the count.
    $: filterSig = JSON.stringify([userId, toZincDate(bindDate), bindDirection ?? "", bookingStatus?.value ?? "", time, passengerName, passportNumber]);
    $: if (mounted && filterSig !== countedSig) loadCount(filterSig);

    async function loadCount(sig: string) {
        countedSig = sig;
        await toResult(() => $api.vBookingSearchCountDetail("1", {
            UserId: userId,
            Date: toZincDate(bindDate),
            Direction: bindDirection ?? "",
            Status: bookingStatus?.value ?? "",
            Time: time,
            PassengerName: passengerName,
            PassportNumber: passportNumber,
        }), $_('bookings.list.countLoadError', { locale: $lang })).match({
            ok: (c) => {
                if (countedSig === sig) total = c.total;
            },
            err: (e) => {
                // degrade to the old prev/next pagination on failure
                console.error(e);
                if (countedSig === sig) total = null;
            }
        });
    }

    $: totalPages = total == null ? null : Math.max(1, Math.ceil(total / PAGE_SIZE));

    // Numbered page buttons with ellipsis, e.g. 1 … 5 6 [7] 8 9 … 14
    // (current page ±2, plus the first and last page). A gap is encoded as
    // ELLIPSIS so the each-block below stays free of TS casts.
    const ELLIPSIS = -1;

    function pageItems(current: number, totalP: number): number[] {
        const wanted = new Set(
            [1, totalP, current - 2, current - 1, current, current + 1, current + 2]
                .filter(p => p >= 1 && p <= totalP)
        );
        const sorted = [...wanted].sort((a, b) => a - b);
        const items: number[] = [];
        let prev = 0;
        for (const p of sorted) {
            if (p - prev > 1) items.push(ELLIPSIS);
            items.push(p);
            prev = p;
        }
        return items;
    }

    $: pages = totalPages == null ? [] : pageItems(data.page, totalPages);
    $: nextDisabled = totalPages == null ? !data.hasMore : data.page >= totalPages;

    // "go to page" direct jump
    let jumpPage = "";

    function jumpToPage() {
        const p = parseInt(jumpPage, 10);
        if (!Number.isFinite(p) || p < 1) return;
        gotoPage(totalPages == null ? p : Math.min(p, totalPages));
        jumpPage = "";
    }

    function jumpKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") jumpToPage();
    }

    const session: any = $page.data.session;
    const isAdmin: boolean = session?.roles?.includes("admin") ?? false;

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

        {#if isAdmin}
            <Input class="w-full"
                   placeholder={$_('bookings.list.filterByUserId', { locale: $lang })} bind:value={userId} on:input={triggerSearch}/>
            <div class="flex gap-4 flex-wrap">
                <Input class="w-full lg:flex-1"
                       placeholder={$_('bookings.list.filterByPassengerName', { locale: $lang })} bind:value={passengerName} on:input={triggerSearch}/>
                <Input class="w-full lg:flex-1"
                       placeholder={$_('bookings.list.filterByPassportNumber', { locale: $lang })} bind:value={passportNumber} on:input={triggerSearch}/>
            </div>
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
            <Select.Root bind:selected={bookingSort} onSelectedChange={bookingSortChange}>
                <Select.Trigger class="w-full lg:max-w-60">
                    <ArrowUpDown class="mr-2 h-4 w-4"/>
                    <Select.Value placeholder={$_('bookings.list.sortNewest', { locale: $lang })}/>
                </Select.Trigger>
                <Select.Content>
                    {#each Object.entries(BOOKING_SORT_KEYS) as [val, key]}
                        <Select.Item value={val}>{$_(`bookings.list.${key}`, { locale: $lang })}</Select.Item>
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
            {#if bindDirection}
                <Select.Root bind:selected={bookingTime} onSelectedChange={bookingTimeChange}>
                    <Select.Trigger class="w-full lg:max-w-60">
                        <Clock class="mr-2 h-4 w-4"/>
                        <Select.Value placeholder={$_('bookings.list.selectTime', { locale: $lang })}/>
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value="">{$_('bookings.list.anyTime', { locale: $lang })}</Select.Item>
                        {#each timings as t}
                            <Select.Item value={t}>{formatClockTime(t, $lang)}</Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
            {/if}
        </div>
        {#if isAdmin}
            <p class="text-sm text-muted-foreground">
                {$_('bookings.list.queueHint', { locale: $lang })}
            </p>
        {/if}

        {#await bookings}
            <Loader/>
        {:then bs}
            <Page notFoundMessage={$_('bookings.list.empty', { locale: $lang })} empty={bs.length === 0}>
                {#each bs as b}
                    <BookingRow {b}/>
                {/each}
            </Page>
            <div class="flex flex-col items-center gap-3 my-4">
                <div class="flex justify-center items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" disabled={data.page <= 1} on:click={() => gotoPage(data.page - 1)}>
                        <ChevronLeft class="mr-2 h-4 w-4"/>
                        {$_('bookings.list.previous', { locale: $lang })}
                    </Button>
                    {#each pages as p}
                        {#if p === ELLIPSIS}
                            <span class="px-1 text-muted-foreground select-none">…</span>
                        {:else}
                            <Button variant={p === data.page ? "default" : "outline"} size="sm" class="w-10 px-0"
                                    on:click={() => gotoPage(p)}>
                                {p}
                            </Button>
                        {/if}
                    {/each}
                    <Button variant="outline" size="sm" disabled={nextDisabled} on:click={() => gotoPage(data.page + 1)}>
                        {$_('bookings.list.next', { locale: $lang })}
                        <ChevronRight class="ml-2 h-4 w-4"/>
                    </Button>
                </div>
                <div class="text-sm text-muted-foreground">
                    {#if totalPages != null && total != null}
                        {$_('bookings.list.pageOf', { locale: $lang, values: { page: data.page, total: totalPages } })}
                        ·
                        {$_('bookings.list.totalResults', { locale: $lang, values: { count: formatNumber(total, $lang) } })}
                    {:else}
                        {$_('bookings.list.pageLabel', { locale: $lang, values: { page: data.page } })}
                    {/if}
                </div>
                <div class="flex items-center gap-2">
                    <label class="text-sm text-muted-foreground" for="booking-page-jump">
                        {$_('bookings.list.goToPage', { locale: $lang })}
                    </label>
                    <Input id="booking-page-jump" type="number" min="1" max={totalPages ?? undefined} class="w-20 h-8"
                           bind:value={jumpPage} on:keydown={jumpKeydown}/>
                    <Button variant="outline" size="sm" on:click={jumpToPage}>
                        {$_('bookings.list.go', { locale: $lang })}
                    </Button>
                </div>
            </div>
        {/await}
    </div>
</div>
