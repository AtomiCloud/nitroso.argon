<script lang="ts">
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    import type {BookingRes} from "$lib/api/core/data-contracts";
    import {ArrowRight} from "lucide-svelte";
    import {format, isAfter, parse, sub} from "date-fns";
    import {Badge} from "$lib/components/ui/badge";
    import {BOOKING_STATUS} from "../../../../routes/bookings/book_status";
    import CancelBooking from "$lib/components/entities/Bookings/CancelBooking.svelte";
    import {Button} from "$lib/components/ui/button";
    import TerminateBooking from "$lib/components/entities/Bookings/TerminateBooking.svelte";
    import QueuePosition from "$lib/components/entities/Bookings/QueuePosition.svelte";

    import moment from "moment-timezone";
    import {page} from "$app/stores";
    import {_} from "svelte-i18n";
    import {lang, formatCalendarDate, formatClockTime, formatDateTime} from "$lib/i18n";

    export let booking: BookingRes;

    function canTerminate(date: string, time: string): boolean {

        const rd = format(parse(date, "dd-MM-yyyy", new Date()), "yyyy-MM-dd");
        //@ts-ignore
        const utcDate = moment.tz(`${rd} ${time}`, "Asia/Singapore").clone().tz("UTC");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = sub(new Date(utcDate as any), {minutes: 120});
        const now = new Date();
        return !isAfter(now, d);
    }

    const b = booking.principal;
    const session: any = $page.data.session;

    // Only these statuses are still waiting in the purchase queue.
    const queued = ["Pending", "Buying", "Recovering"].includes(b.status ?? "");
</script>

<div class="flex flex-wrap w-full gap-4">
    <Card.Root class="flex-1 min-w-fit">
        <Card.Header>
            <div class="flex gap-4 justify-center flex-wrap-reverse md:flex-nowrap sm:justify-between items-center">
                <div>
                    <Card.Title>
                        <div class="flex flex-wrap gap-1 items-center">
                            <div>{b.direction == "WToJ" ? $_('bookingActions.card.woodlands', { locale: $lang }) : $_('bookingActions.card.jbSentral', { locale: $lang })}</div>
                            <ArrowRight class="h-4 w-4"/>
                            <div>{b.direction == "WToJ" ? $_('bookingActions.card.jbSentral', { locale: $lang }) : $_('bookingActions.card.woodlands', { locale: $lang })}</div>
                        </div>
                    </Card.Title>
                    <Card.Description>
                        <div class="flex flex-col gap-2 my-4">
                            <Badge class="flex justify-center flex-wrap gap-2">
                                <div>
                                    {formatCalendarDate(parse(b.date, "dd-MM-yyyy", new Date()), $lang)}
                                </div>
                                <div>
                                    {formatClockTime(b.time, $lang)}
                                </div>
                            </Badge>
                            <div>{$_('bookingActions.card.started', { locale: $lang, values: { datetime: formatDateTime(new Date(b.createdAt), $lang) } })}</div>
                        </div>
                    </Card.Description>
                </div>
                <div class="flex flex-col gap-1.5 text-center">
                    <Badge class="{BOOKING_STATUS[b.status].color} text-md">{$_(`status.booking.${b.status}`, { locale: $lang })}</Badge>
                    {#if queued}
                        <QueuePosition bookingId={b.id}/>
                    {/if}
                </div>
            </div>
        </Card.Header>
    </Card.Root>
    {#if b.status === "Pending" || b.status === "Completed" }
        <Card.Root class="flex-1">
            <Card.Header>
                <Card.Title>
                    {$_('bookingActions.card.actions', { locale: $lang })}
                </Card.Title>
            </Card.Header>
            <Card.Description>
                <div class="flex flex-wrap justify-center gap-4 p-4 w-full">
                    {#if b.status === "Pending"}
                        <CancelBooking booking={b}/>
                    {:else if b.status === "Completed" && canTerminate(b.date, b.time)}
                        <Button class="w-full sm:max-w-40" href="{b.ticketLink}">{$_('bookingActions.card.viewTicket', { locale: $lang })}</Button>
                        <TerminateBooking booking={b}/>
                    {/if}
                </div>
            </Card.Description>
        </Card.Root>
    {/if}
</div>
<div class="flex flex-wrap w-full gap-4">
    <Card.Root class="flex-1 min-w-fit">
        <Card.Header>
            <div class="flex justify-between items-center">
                <div>
                    <Card.Title class="flex gap-4 items-center">
                        <div>{booking.principal.passenger.fullName}</div>
                    </Card.Title>
                    <Card.Description>
                        <div>{booking.principal.passenger.passportNumber}</div>
                        {#if session?.roles?.includes("admin") && booking.user}
                            <div class="text-xs text-muted-foreground mt-2">
                                <strong>{$_('bookingActions.card.owner', { locale: $lang })}</strong>
                                <a href="/users/{booking.user.id}" class="text-blue-600 hover:text-blue-800 underline">
                                    {booking.user.username || booking.user.id}
                                </a>
                                {#if booking.user.email}
                                    ({booking.user.email})
                                {/if}
                            </div>
                        {/if}
                    </Card.Description>

                </div>
                <Badge class="{booking.principal.passenger.gender === 'M' ? 'bg-blue-500' : 'bg-pink-500' }">{booking.principal.passenger.gender  }</Badge>
            </div>
        </Card.Header>
        <Card.Content class="bg-muted">
            <div class="flex flex-col justify-center gap-1.5 pt-4">
                <div class="text-md text-center sm:text-start text-muted-foreground">
                    {$_('bookingActions.card.passportExpiresOn', { locale: $lang })}
                    <span class="underline">
                        {formatCalendarDate(parse(booking.principal.passenger.passportExpiry, "dd-MM-yyyy", new Date()), $lang)}
                    </span>
                </div>
            </div>
        </Card.Content>
    </Card.Root>
    {#if booking.principal.status === "Completed"}
        <Card.Root class="flex-1">
            <Card.Header>
                <Card.Title>
                    {$_('bookingActions.card.ticketInformation', { locale: $lang })}
                </Card.Title>
                <Card.Description>
                    <div class="flex flex-col">
                        <div>{$_('bookingActions.card.ticketNo', { locale: $lang, values: { value: booking.principal.ticketNo } })}</div>
                        <div>{$_('bookingActions.card.bookingNo', { locale: $lang, values: { value: booking.principal.bookingNo } })}</div>
                    </div>
                </Card.Description>
            </Card.Header>
            <Card.Content>
                <div class="flex flex-col">
                    <Button class="w-full sm:max-w-40" href={booking.principal.ticketLink}>
                        {$_('bookingActions.card.viewTicket', { locale: $lang })}
                    </Button>
                    <div class="text-muted-foreground text-sm">
                        {$_('bookingActions.card.completedOn', { locale: $lang, values: { datetime: formatDateTime(new Date(booking.principal.completedAt), $lang) } })}
                    </div>
                </div>

            </Card.Content>
        </Card.Root>
    {:else if ["Cancelled", "Refunded", "Terminated", "Duplicate"].includes(booking.principal.status)}
        <Card.Root class="flex-1 flex justify-center items-center min-w-fit p-8">
            <Card.Title class="text-center">
                {$_('bookingActions.card.statusOn', { locale: $lang, values: { status: $_(`status.booking.${booking.principal.status}`, { locale: $lang }), datetime: formatDateTime(new Date(booking.principal.completedAt), $lang) } })}
            </Card.Title>
        </Card.Root>
    {/if}
</div>
