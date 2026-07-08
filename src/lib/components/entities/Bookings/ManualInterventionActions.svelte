<script lang="ts">
    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {LucideLoader, RotateCcw, LucideTrash2, LucideCheck} from "lucide-svelte";
    // @ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    import {Input} from "$lib/components/ui/input";
    import type {BookingPrincipalRes} from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {page} from "$app/stores";

    export let b: BookingPrincipalRes;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $: session = $page.data.session as any;
    $: isAdmin = session?.roles?.includes("admin") ?? false;

    let busy = false;
    let completeOpen = false;
    let bookingNo = "";
    let ticketNo = "";
    let files: FileList | null = null;
    $: file = files?.[0] ?? null;
    $: formValid = !!file && bookingNo.trim().length > 0 && ticketNo.trim().length > 0;

    async function run(action: () => Promise<any>, okMsg: string, errMsg: string) {
        busy = true;
        await toResult(action, errMsg).match({
            ok: () => {
                toast.info(okMsg);
                completeOpen = false;
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        });
        busy = false;
    }

    const cancel = () =>
        run(() => $api.vBookingCancelCreate(b.id, "1.0", {}),
            "Booking cancelled and refunded", "Failed to cancel booking");

    const revert = () =>
        run(() => $api.vBookingRevertCreate(b.id, "1.0", {force: true}),
            "Booking reverted to pending", "Failed to revert booking");

    const completeConsume = () =>
        run(() => $api.vBookingCompleteCreate(b.id, "1.0", {file: file!}, {bookingNo, ticketNo}),
            "Booking completed (reserve collected)", "Failed to complete booking");

    const completeNoCollect = () =>
        run(() => $api.vBookingCompleteNoCollectCreate(b.id, "1.0", {file: file!}, {bookingNo, ticketNo}),
            "Booking completed (reserve left held)", "Failed to complete booking");
</script>

{#if isAdmin}
    <Button variant="destructive" class="w-full sm:max-w-40" disabled={busy} on:click={cancel}>
        <LucideTrash2 class="mr-2 h-4 w-4"/>
        Cancel (Refund)
    </Button>

    <Button variant="outline" class="w-full sm:max-w-40" disabled={busy} on:click={revert}>
        <RotateCcw class="mr-2 h-4 w-4"/>
        Revert to Pending
    </Button>

    <Dialog.Root bind:open={completeOpen}>
        <Dialog.Trigger class="{buttonVariants({ variant: 'default' })} w-full sm:max-w-40">
            <LucideCheck class="mr-2 h-4 w-4"/>
            Complete…
        </Dialog.Trigger>
        <Dialog.Content class="w-[95vw] max-w-lg">
            <Dialog.Header>
                <Dialog.Title>Complete booking</Dialog.Title>
                <Dialog.Description>
                    Upload the KTMB ticket and enter its numbers, then choose whether to collect the held reserve.
                </Dialog.Description>
            </Dialog.Header>

            <div class="flex flex-col gap-3 py-2">
                <div class="text-sm font-medium">Ticket PDF</div>
                <input type="file" accept="application/pdf" bind:files
                       class="block w-full text-sm border rounded-md p-2"/>

                <div class="text-sm font-medium">Booking No</div>
                <Input placeholder="Booking No" bind:value={bookingNo}/>

                <div class="text-sm font-medium">Ticket No</div>
                <Input placeholder="Ticket No" bind:value={ticketNo}/>

                {#if !formValid}
                    <div class="text-sm text-muted-foreground">A ticket PDF, Booking No and Ticket No are all required.</div>
                {/if}
            </div>

            <div class="flex flex-col sm:flex-row gap-2 justify-end">
                <Button variant="default" disabled={busy || !formValid} on:click={completeConsume}>
                    {#if busy}<LucideLoader class="mr-2 h-4 w-4 animate-spin"/>{/if}
                    Complete &amp; Charge
                </Button>
                <Button variant="secondary" disabled={busy || !formValid} on:click={completeNoCollect}>
                    {#if busy}<LucideLoader class="mr-2 h-4 w-4 animate-spin"/>{/if}
                    Complete (No Charge)
                </Button>
            </div>
        </Dialog.Content>
    </Dialog.Root>
{/if}
