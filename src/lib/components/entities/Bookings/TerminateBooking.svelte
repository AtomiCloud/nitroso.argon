<script lang="ts">

    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {AlertTriangle, LucideLoader, LucideTrash2} from "lucide-svelte";

    // @ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    // @ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import type {BookingPrincipalRes, FeeRes} from "$lib/api/core/data-contracts";
    import {describeFee, loadFee} from "$lib/api/fee";
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

    let confirm = "";
    let terminationFee: FeeRes | null = null;
    let feeLoading = false;
    let feeLoadFailed = false;
    let feeRequested = false;

    $: feeDescription = terminationFee == null
        ? ""
        : describeFee(terminationFee, $_, $lang);

    // A configurable fee must be disclosed before the destructive action.
    // Load it each time the dialog opens and block confirmation if the value
    // cannot be verified against Zinc.
    $: if (dialogOpen && !feeRequested) {
        feeRequested = true;
        void loadTerminationFee();
    }
    $: if (!dialogOpen && feeRequested) {
        feeRequested = false;
        terminationFee = null;
        feeLoadFailed = false;
        confirm = "";
    }

    async function loadTerminationFee() {
        feeLoading = true;
        feeLoadFailed = false;
        try {
            terminationFee = await loadFee(
                $api,
                "Termination",
                $_('bookingActions.terminate.feeLoadFailed', { locale: $lang }),
            );
            feeLoadFailed = terminationFee == null;
        } finally {
            feeLoading = false;
        }
    }

    async function submit() {
        if (valid && terminationFee != null && !feeLoadFailed) await terminateBooking();
    }

    let submitting = false;

    async function terminateBooking() {
        submitting = true;
        try {
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
        } finally {
            submitting = false;
        }
    }

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
                            {#if feeLoading}
                                <span class="inline-flex items-center gap-2" role="status">
                                    <LucideLoader class="h-4 w-4 animate-spin"/>
                                    {$_('bookingActions.terminate.feeLoading', { locale: $lang })}
                                </span>
                            {:else if feeLoadFailed || terminationFee == null}
                                <span class="flex flex-col items-start gap-2 text-destructive" role="alert">
                                    <span>{$_('bookingActions.terminate.feeLoadFailed', { locale: $lang })}</span>
                                    <Button variant="outline" class="h-10 px-3" on:click={loadTerminationFee}>
                                        {$_('bookingActions.terminate.feeRetry', { locale: $lang })}
                                    </Button>
                                </span>
                            {:else}
                                {$_('bookingActions.terminate.feeNotice', {
                                    locale: $lang,
                                    values: {fee: feeDescription},
                                })}
                            {/if}
                        </Alert.Description>
                    </Alert.Root>

                    <p class="text-justify py-2">
                        {$_('bookingActions.terminate.typeNameBefore', { locale: $lang })} <code
                            class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                        {booking.passenger.fullName}
                    </code> {$_('bookingActions.terminate.typeNameAfter', { locale: $lang })}
                    </p>

                    <div class="flex flex-col">
                        <label class="sr-only" for={`terminate-${booking.id}`}>{$_('fields.name', { locale: $lang })}</label>
                        <Input id={`terminate-${booking.id}`} placeholder={$_('fields.name', { locale: $lang })}
                               bind:value={confirm}
                        />
                        <div class="text-sm text-destructive {valid ? 'opacity-0' : 'opacity-1'}">
                            {$_('bookingActions.terminate.typeNameError', { locale: $lang })}
                        </div>
                    </div>


                    <Button class="my-2" on:click={submit}
                            disabled={submitting || !valid || feeLoading || feeLoadFailed || terminationFee == null}>
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
