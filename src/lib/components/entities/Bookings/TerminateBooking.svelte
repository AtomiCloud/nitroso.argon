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
    import {page} from "$app/stores";
    import type {Session} from "@auth/core/types";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";

    let dialogOpen = false;
    export let booking: BookingPrincipalRes;

    async function submit() {
        if (valid) await terminateBooking();
    }

    let submitting = false;

    async function terminateBooking() {
        submitting = true;
        const session: Session | any = $page.data.session;
        const user = session?.roles?.includes("admin")
            ? {}
            : {userId: $page.data.user.principal.id}
        await toResult(() => $api.vBookingTerminateCreate(booking.id, "1.0", user),
            $_('bookingActions.terminate.error', { locale: $lang })).match({
            ok: ok => {
                toast.info($_('bookingActions.terminate.success', { locale: $lang }));
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
        {$_('bookingActions.terminate.trigger', { locale: $lang })}
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>{$_('bookingActions.terminate.title', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        {$_('bookingActions.terminate.intro', { locale: $lang })}
                    </p>
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title>{$_('bookingActions.terminate.takeNoteTitle', { locale: $lang })}</Alert.Title>
                        <Alert.Description>
                            {$_('bookingActions.terminate.takeNoteBefore', { locale: $lang })}
                            <span class="underline">{$_('bookingActions.terminate.refundPercent', { locale: $lang })}</span>
                            {$_('bookingActions.terminate.takeNoteAfter', { locale: $lang })}
                        </Alert.Description>
                    </Alert.Root>

                    <p class="text-justify py-2">
                        {$_('bookingActions.terminate.typeNameBefore', { locale: $lang })} <code
                            class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                        {booking.passenger.fullName}
                    </code> {$_('bookingActions.terminate.typeNameAfter', { locale: $lang })}
                    </p>

                    <div class="flex flex-col">
                        <Input placeholder={$_('fields.name', { locale: $lang })}
                               bind:value={confirm}
                        />
                        <div class="text-sm text-destructive {valid ? 'opacity-0' : 'opacity-1'}">
                            {$_('bookingActions.terminate.typeNameError', { locale: $lang })}
                        </div>
                    </div>


                    <Button class="my-2" on:click={submit} disabled={submitting || !valid}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        {$_('bookingActions.terminate.confirmButton', { locale: $lang })}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
