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
    import moment from "moment-timezone";

    export let b: BookingPrincipalRes;

    function canTerminate(date: string, time: string): boolean {

        const rd = format(parse(date, "dd-MM-yyyy", new Date()), "yyyy-MM-dd");
        //@ts-ignore
        const utcDate = moment.tz(`${rd} ${time}`, "Asia/Singapore").clone().tz("UTC");
        const d = sub(new Date(utcDate), {minutes: 120});
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
                        <div>{b.direction == "WToJ" ? "Woodlands" : "JB Sentral"}</div>
                        <ArrowRight class="h-4 w-4"/>
                        <div>{b.direction == "WToJ" ? "JB Sentral" : "Woodlands"}</div>
                    </div>
                </Card.Title>
                <Card.Description>
                    <div class="flex flex-col gap-2 my-4 items-center md:items-start">
                        <Badge class="flex justify-center">{format(parse(b.date, "dd-MM-yyyy", new Date()), "dd MMM yyyy")} {format(parse(b.time, "HH:mm:ss", new Date()), "hh:mm a")}</Badge>
                        <div>{b.passenger.fullName} ({b.passenger.passportNumber})</div>
                    </div>
                </Card.Description>
            </div>
            <div class="flex gap-1.5 text-center">
                <Badge class="{BOOKING_STATUS[b.status].color}">{b.status}</Badge>
            </div>
        </div>
    </Card.Header>
    <Card.Content class="bg-muted">
        <div class="flex flex-wrap justify-end gap-4 pt-4 w-full">

            {#if b.status === "Pending"}
                <CancelBooking booking={b}/>
            {:else if b.status === "Completed" && canTerminate(b.date, b.time)}
                <Button class="w-full sm:max-w-40" href="{b.ticketLink}">View Ticket</Button>
                <TerminateBooking booking={b}/>
            {/if}
            <Button class="w-full sm:max-w-40" href="/bookings/{b.id}">
                View Details
            </Button>
        </div>
    </Card.Content>
</Card.Root>
