<script lang="ts">

    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {AlertTriangle, LucideLoader, LucideTrash2, Clock, TrendingUp, Users} from "lucide-svelte";

    // @ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    // @ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    // @ts-ignore
    import * as Card from "$lib/components/ui/card";
    import type {BookingPrincipalRes} from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {Input} from "$lib/components/ui/input";
    import {page} from "$app/stores";
    import {tick} from "svelte";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";

    let dialogOpen = false;
    let showCancellationStep = false;
    let dialogElement: HTMLElement;
    export let booking: BookingPrincipalRes;
    
    function proceedToCancellation() {
        showCancellationStep = true;
        if (dialogElement) {
            setTimeout(() => {
                dialogElement.scrollTop = 0;
            }, 0);
        }
    }
    
    function stayWithBooking() {
        dialogOpen = false;
        showCancellationStep = false;
        toast.info($_('bookingActions.cancel.stayToast', { locale: $lang }));
    }
    
    async function openDialog() {
        dialogOpen = true;
        // Reset state when opening dialog
        showCancellationStep = false;
        // Wait for DOM to update, then scroll to top
        await tick();
        setTimeout(() => {
            if (dialogElement) {
                dialogElement.scrollTop = 0;
            }
        }, 50);
    }

    async function submit() {
        if (valid) await cancelBooking();
    }

    let submitting = false;

    async function cancelBooking() {
        submitting = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session: any = $page.data.session;

        const user = session?.roles?.includes("admin")
            ? {}
            : {userId: $page.data.user.principal.id}

        await toResult(() => $api.vBookingCancelCreate(booking.id, "1.0", user),
            $_('bookingActions.cancel.error', { locale: $lang })).match({
            ok: ok => {
                toast.info($_('bookingActions.cancel.success', { locale: $lang }));
                dialogOpen = false;
                showCancellationStep = false;
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
    
    // Only scroll to top when dialog first opens or when switching between steps
    let lastDialogState = false;
    let lastCancellationStep = false;
    
    $: if (dialogOpen !== lastDialogState || showCancellationStep !== lastCancellationStep) {
        if (dialogElement && (dialogOpen || showCancellationStep !== lastCancellationStep)) {
            setTimeout(() => {
                dialogElement.scrollTop = 0;
            }, 10);
        }
        lastDialogState = dialogOpen;
        lastCancellationStep = showCancellationStep;
    }

</script>

<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger class="{buttonVariants({ variant: 'destructive' })}  w-full sm:max-w-40" on:click={openDialog}>
        <LucideTrash2 class="mr-2 h-4 w-4"/>
        {$_('actions.cancel', { locale: $lang })}
    </Dialog.Trigger>
    <Dialog.Content class="w-[95vw] max-w-2xl max-h-[90vh]">
        <div class="overflow-y-auto max-h-[calc(90vh-8rem)]" bind:this={dialogElement}>
        <Dialog.Header>
            <Dialog.Title>{showCancellationStep ? $_('bookingActions.cancel.title', { locale: $lang }) : $_('bookingActions.cancel.educationTitle', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                {#if !showCancellationStep}
                    <!-- Education Step -->
                    <div class="flex flex-col gap-4 sm:gap-6">
                        <div class="text-center">
                            <h3 class="text-lg sm:text-lg font-semibold mb-1 sm:mb-2 text-foreground">{$_('bookingActions.cancel.eduHeading', { locale: $lang })}</h3>
                            <p class="text-base text-muted-foreground">{$_('bookingActions.cancel.eduSubheading', { locale: $lang })}</p>
                        </div>
                        
                        <div class="grid sm:grid-cols-3 gap-3">
                            <Card.Root class="p-3 sm:p-4">
                                <Card.Content class="flex flex-col items-center text-center space-y-1.5 sm:space-y-2 p-0">
                                    <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                        <Users class="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h4 class="font-semibold text-sm sm:text-sm">{$_('bookingActions.cancel.peakTitle', { locale: $lang })}</h4>
                                    <p class="text-sm text-muted-foreground leading-tight">{$_('bookingActions.cancel.peakDesc', { locale: $lang })}</p>
                                </Card.Content>
                            </Card.Root>
                            
                            <Card.Root class="p-3 sm:p-4">
                                <Card.Content class="flex flex-col items-center text-center space-y-1.5 sm:space-y-2 p-0">
                                    <div class="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                        <TrendingUp class="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h4 class="font-semibold text-sm sm:text-sm">{$_('bookingActions.cancel.windowTitle', { locale: $lang })}</h4>
                                    <p class="text-sm text-muted-foreground leading-tight">{$_('bookingActions.cancel.windowDesc', { locale: $lang })}</p>
                                </Card.Content>
                            </Card.Root>
                            
                            <Card.Root class="p-3 sm:p-4">
                                <Card.Content class="flex flex-col items-center text-center space-y-1.5 sm:space-y-2 p-0">
                                    <div class="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                                        <Clock class="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <h4 class="font-semibold text-sm sm:text-sm">{$_('bookingActions.cancel.patienceTitle', { locale: $lang })}</h4>
                                    <p class="text-sm text-muted-foreground leading-tight">{$_('bookingActions.cancel.patienceDesc', { locale: $lang })}</p>
                                </Card.Content>
                            </Card.Root>
                        </div>
                        
                        <Alert.Root class="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-3 sm:p-4">
                            <Clock class="h-4 w-4" />
                            <Alert.Title class="text-base sm:text-base">{$_('bookingActions.cancel.proTipTitle', { locale: $lang })}</Alert.Title>
                            <Alert.Description class="text-sm sm:text-sm leading-relaxed">
                                {$_('bookingActions.cancel.proTipBody', { locale: $lang })}
                                <strong>{$_('bookingActions.cancel.proTipEmphasis', { locale: $lang })}</strong>
                            </Alert.Description>
                        </Alert.Root>
                        
                        <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <Button variant="default" on:click={stayWithBooking} class="flex-1 h-11 sm:h-10">
                                <Clock class="mr-2 h-4 w-4" />
                                {$_('bookingActions.cancel.keepWait', { locale: $lang })}
                            </Button>
                            <Button variant="outline" on:click={proceedToCancellation} class="flex-1 h-11 sm:h-10">
                                <LucideTrash2 class="mr-2 h-4 w-4" />
                                {$_('bookingActions.cancel.stillCancel', { locale: $lang })}
                            </Button>
                        </div>
                    </div>
                {:else}
                    <!-- Original Cancellation Step -->
                    <div class="flex flex-col gap-4">
                        <p class="text-justify py-2 text-base">
                            {$_('bookingActions.cancel.intro', { locale: $lang, values: { name: booking.passenger.fullName } })}
                        </p>
                        <Alert.Root>
                            <AlertTriangle class="h-4 w-4"/>
                            <Alert.Title>{$_('bookingActions.cancel.takeNoteTitle', { locale: $lang })}</Alert.Title>
                            <Alert.Description>
                                {$_('bookingActions.cancel.takeNoteBody', { locale: $lang })}
                            </Alert.Description>
                        </Alert.Root>

                        <p class="text-justify py-2 text-base">
                            {$_('bookingActions.cancel.typeNameBefore', { locale: $lang })} <code
                                class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                            {booking.passenger.fullName}
                        </code> {$_('bookingActions.cancel.typeNameAfter', { locale: $lang })}
                        </p>

                        <div class="flex flex-col gap-4">
                            <Input placeholder={$_('fields.name', { locale: $lang })}
                                   bind:value={confirm}
                            />
                            <div class="text-base text-destructive {valid ? 'opacity-0' : 'opacity-1'}">
                                {$_('bookingActions.cancel.typeNameError', { locale: $lang })}
                            </div>
                        </div>

                        <div class="flex gap-3">
                            <Button variant="outline" on:click={() => showCancellationStep = false} class="flex-1">
                                {$_('actions.back', { locale: $lang })}
                            </Button>
                            <Button variant="destructive" class="flex-1" on:click={submit} disabled={submitting || !valid}>
                                {#if submitting}
                                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                                {/if}
                                {$_('bookingActions.cancel.confirmButton', { locale: $lang })}
                            </Button>
                        </div>
                    </div>
                {/if}
            </Dialog.Description>
        </Dialog.Header>
        </div>
    </Dialog.Content>
</Dialog.Root>
