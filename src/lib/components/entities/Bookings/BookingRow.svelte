<script lang="ts">
    import {format, isAfter, parse, sub} from "date-fns";
    import {ArrowRight} from "lucide-svelte";
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    import type {BookingPrincipalRes} from "$lib/api/core/data-contracts";
    import {BOOKING_STATUS} from "../../../../routes/bookings/book_status";
    import {Badge} from "$lib/components/ui/badge";
    import {Button} from "$lib/components/ui/button";
    import TerminateBooking from "$lib/components/entities/Bookings/TerminateBooking.svelte";
    import CancelBooking from "$lib/components/entities/Bookings/CancelBooking.svelte";
    import ManualInterventionActions from "$lib/components/entities/Bookings/ManualInterventionActions.svelte";
    import moment from "moment-timezone";
    import {_} from "svelte-i18n";
    import {lang, formatCalendarDate, formatClockTime} from "$lib/i18n";
    import {LucideLoader, RotateCcw} from "lucide-svelte";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {page} from "$app/stores";

    export let b: BookingPrincipalRes;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $: session = $page.data.session as any;
    $: isAdmin = session?.roles?.includes("admin") ?? false;

    let reverting = false;

    // Admin-only manual revert of a stuck Buying booking back to Pending so it
    // retries (e.g. after a transient KTMB failure like an insufficient wallet).
    // zinc's Revert is guarded (Buying-only + uncaptured), so this is safe.
    async function revertBuying() {
        reverting = true;
        await toResult(() => $api.vBookingRevertCreate(b.id, "1.0"),
            $_('bookingActions.row.revertError', { locale: $lang })).match({
            ok: () => {
                toast.info($_('bookingActions.row.revertSuccess', { locale: $lang }));
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        });
        reverting = false;
    }

    function canTerminate(date: string, time: string): boolean {

        const rd = format(parse(date, "dd-MM-yyyy", new Date()), "yyyy-MM-dd");
        //@ts-ignore
        const utcDate = moment.tz(`${rd} ${time}`, "Asia/Singapore").clone().tz("UTC");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = sub(new Date(utcDate as any), {minutes: 120});
        const now = new Date();
        return !isAfter(now, d);
    }

</script>


<Card.Root>
    <Card.Header>
        <div class="flex gap-4 justify-center flex-wrap-reverse md:flex-nowrap sm:justify-between items-center">
            <div>
                <Card.Title>
                    <div class="flex gap-1 items-center w-full">
                        <div>{b.direction === "WToJ" ? $_('bookingActions.card.woodlands', { locale: $lang }) : $_('bookingActions.card.jbSentral', { locale: $lang })}</div>
                        <ArrowRight class="h-4 w-4"/>
                        <div>{b.direction === "WToJ" ? $_('bookingActions.card.jbSentral', { locale: $lang }) : $_('bookingActions.card.woodlands', { locale: $lang })}</div>
                    </div>
                </Card.Title>
                <Card.Description>
                    <div class="flex flex-col gap-2 my-4 items-center md:items-start">
                        <Badge class="flex justify-center">{formatCalendarDate(parse(b.date, "dd-MM-yyyy", new Date()), $lang)}, {formatClockTime(b.time, $lang)}</Badge>
                        <div>{b.passenger.fullName} ({b.passenger.passportNumber})</div>
                    </div>
                </Card.Description>
            </div>
            <div class="flex gap-1.5 text-center">
                <Badge class="{BOOKING_STATUS[b.status].color}">{$_(`status.booking.${b.status}`, { locale: $lang })}</Badge>
            </div>
        </div>
    </Card.Header>
    <Card.Content class="bg-muted">
        <div class="flex flex-wrap justify-end gap-4 pt-4 w-full">

            {#if b.status === "Pending"}
                <CancelBooking booking={b}/>
            {:else if b.status === "Completed" && canTerminate(b.date, b.time)}
                <Button class="w-full sm:max-w-40" href="{b.ticketLink}">{$_('bookingActions.card.viewTicket', { locale: $lang })}</Button>
                <TerminateBooking booking={b}/>
            {/if}
            {#if b.status === "Buying" && isAdmin}
                <Button variant="outline" class="w-full sm:max-w-40" disabled={reverting} on:click={revertBuying}>
                    {#if reverting}
                        <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                    {:else}
                        <RotateCcw class="mr-2 h-4 w-4"/>
                    {/if}
                    {$_('bookingActions.row.revert', { locale: $lang })}
                </Button>
            {/if}
            {#if b.status === "RequireManualIntervention"}
                <ManualInterventionActions {b}/>
            {/if}
            <Button class="w-full sm:max-w-40" href="/bookings/{b.id}">
                {$_('bookingActions.row.viewDetails', { locale: $lang })}
            </Button>
        </div>
    </Card.Content>
</Card.Root>
