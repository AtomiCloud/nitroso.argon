<script lang="ts">

    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {AlertTriangle, LucideLoader, LucideTrash2} from "lucide-svelte";

    // @ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    // @ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import type {BookingPrincipalRes} from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {Input} from "$lib/components/ui/input";

    let dialogOpen = false;
    export let booking: BookingPrincipalRes;

    async function submit() {
        if (valid) await terminateBooking();
    }

    let submitting = false;

    async function terminateBooking() {
        submitting = true;
        await toResult(() => $api.vBookingTerminateCreate(booking.id, "1.0"),
            "Failed to terminate booking").match({
            ok: ok => {
                toast.info(`Successfully terminated booking`);
                dialogOpen = false;
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        })
        submitting = false;
    }

    let confirm = "";
    $: valid = confirm === booking.passenger.fullName;

</script>

<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger class="{buttonVariants({ variant: 'destructive' })} w-full sm:max-w-40">
        <LucideTrash2 class="mr-2 h-4 w-4"/>
        Terminate
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Terminate Booking</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        Our bunnies have already managed to secure your ticket on KITS! Terminating
                        this ticket release the your ticket back to KITS.
                    </p>
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title>Take Note!</Alert.Title>
                        <Alert.Description>
                            Terminating a booking will only refund
                            <span class="underline">50%</span> of the
                            ticket price you paid for. This is to prevent
                            abuse of the system.
                        </Alert.Description>
                    </Alert.Root>

                    <p class="text-justify py-2">
                        Please type the name of the passenger, <code
                            class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                        {booking.passenger.fullName}
                    </code> to proceed.
                    </p>

                    <div class="flex flex-col">
                        <Input placeholder="Name"
                               bind:value={confirm}
                        />
                        <div class="text-sm text-destructive {valid ? 'opacity-0' : 'opacity-1'}">
                            Please type the name of the passenger of the booking to proceed.
                        </div>
                    </div>


                    <Button class="my-2" on:click={submit} disabled={submitting || !valid}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        Terminate Booking
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
