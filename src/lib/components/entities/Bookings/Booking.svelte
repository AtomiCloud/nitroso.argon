<script lang="ts">
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    import type {BookingRes} from "$lib/api/core/data-contracts";
    import {ArrowRight} from "lucide-svelte";
    import {format, parse} from "date-fns";
    import {Badge} from "$lib/components/ui/badge";
    import {BOOKING_STATUS} from "../../../../routes/bookings/book_status";
    import CancelBooking from "$lib/components/entities/Bookings/CancelBooking.svelte";
    import {Button} from "$lib/components/ui/button";
    import TerminateBooking from "$lib/components/entities/Bookings/TerminateBooking.svelte";

    export let booking: BookingRes;

    const b = booking.principal;
</script>

<div class="flex flex-wrap w-full gap-4">
    <Card.Root class="flex-1">
        <Card.Header>
            <div class="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <Card.Title>
                        <div class="flex flex-wrap gap-1 items-center">
                            <div>{b.direction == "WToJ" ? "Woodlands" : "JB Sentral"}</div>
                            <ArrowRight class="h-4 w-4"/>
                            <div>{b.direction == "WToJ" ? "JB Sentral" : "Woodlands"}</div>
                        </div>
                    </Card.Title>
                    <Card.Description>
                        <div class="flex flex-col gap-2 my-4">
                            <Badge class="flex justify-center flex-wrap gap-2">
                                <div>
                                    {format(parse(b.date, "dd-MM-yyyy", new Date()), "dd MMM yyyy")}
                                </div>
                                <div>
                                    {format(parse(b.time, "HH:mm:ss", new Date()), "HH:mm a")}
                                </div>
                            </Badge>
                            <div>Started {format(new Date(b.createdAt), "dd MMM yyyy, HH:mm a")}</div>
                        </div>
                    </Card.Description>
                </div>
                <div class="flex flex-col gap-1.5 text-center">
                    <Badge class="{BOOKING_STATUS[b.status].color}">{b.status}</Badge>
                </div>
            </div>
        </Card.Header>
    </Card.Root>
    {#if b.status === "Pending" || b.status === "Completed" }
        <Card.Root class="flex-1">
            <Card.Header>
                <Card.Title>
                    Actions
                </Card.Title>
            </Card.Header>
            <Card.Description>
                <div class="flex justify-center gap-4 p-4 w-full">
                    {#if b.status === "Pending"}
                        <CancelBooking booking={b}/>
                    {:else if b.status === "Completed"}
                        <Button href="{b.ticketLink}">View Ticket</Button>
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
            <Card.Title class="flex gap-4 items-center">
                <div>{booking.principal.passenger.fullName}</div>
                <Badge class="{booking.principal.passenger.gender === 'M' ? 'bg-blue-500' : 'bg-pink-500' }">{booking.principal.passenger.gender  }</Badge>
            </Card.Title>
            <Card.Description>
                {booking.principal.passenger.passportNumber}
            </Card.Description>
        </Card.Header>
        <Card.Content class="bg-muted">
            <div class="flex flex-col justify-center gap-1.5 pt-4">
                <div class="text-md text-muted-foreground">
                    Passport expires on
                    <span class="underline">
                        {format(booking.principal.passenger.passportExpiry, "dd MMM yyyy")}
                    </span>
                </div>
            </div>
        </Card.Content>
    </Card.Root>
    {#if booking.principal.status === "Completed"}
        <Card.Root class="flex-1">
            <Card.Header>
                <Card.Title>
                    Ticket Information
                </Card.Title>
                <Card.Description>
                    Completed on {format(new Date(booking.principal.completedAt), "dd MMM yyyy, HH:mm a")}
                </Card.Description>
            </Card.Header>
            <Card.Content>
                <Button href={booking.principal.ticketLink}>
                    View Ticket
                </Button>
            </Card.Content>
        </Card.Root>
    {:else if ["Cancelled", "Refunded", "Terminated"].includes(booking.principal.status)}
        <Card.Root class="flex-1 flex justify-center items-center min-w-fit py-8">
            <Card.Title class="text-center">
                {booking.principal.status}
                on {format(new Date(booking.principal.completedAt), "dd MMM yyyy, HH:mm a")}
            </Card.Title>
        </Card.Root>
    {/if}
</div>
