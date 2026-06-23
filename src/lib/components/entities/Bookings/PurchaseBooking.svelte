<script lang="ts">

    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {AlertTriangle, LucideLoader, ShoppingBasket} from "lucide-svelte";

    // @ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    // @ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {goto} from "$app/navigation";
    import {format, parse} from "date-fns";
    import type {ZodIssue} from "zod";
    import {_} from "svelte-i18n";
    import {lang, formatCalendarDate, formatClockTime} from "$lib/i18n";


    export let checked: boolean;
    export let passenger: {
        fullName: string
        gender: string
        passportNumber: string
        passportExpiry: Date
    };

    export let userId: string;

    export let date: string;

    export let time: string;

    export let direction: string;

    export let taints: Record<string, boolean>;

    export let errors: ZodIssue[];

    export let wallet: number;
    export let cost: number;

    let dialogOpen = false;

    let submitting = false;

    function redirectSuccess() {
        goto(`/bookings/purchase/success?date=${date}&time=${time}&direction=${direction}&userId=${userId}&name=${passenger.fullName}&passport=${passenger.passportNumber}`);
    }


    $: isValid = errors.length === 0 && Object.entries(taints).length > 0 && wallet >= cost;

    function toNativeDate(date: string) {
        return parse(date, "dd-MM-yyyy", new Date());
    }

    function toDisplayDate(date: string) {
        return formatCalendarDate(toNativeDate(date), $lang);
    }

    function displayTime(time: string): string {
        return formatClockTime(time, $lang);
    }

    function track() {
        (window as any)?.fathom?.trackEvent('Trigger Buy');
    }

    async function buy() {
        submitting = true;
        (window as any)?.fathom?.trackEvent('Buy')
        if (checked) {
            await toResult(() => $api.vPassengerCreate(userId, "1.0", {
                fullName: passenger.fullName,
                passportExpiry: format(passenger.passportExpiry, "dd-MM-yyyy"),
                gender: passenger.gender,
                passportNumber: passenger.passportNumber,
            }), $_('bookingActions.purchase.createPassengerError', { locale: $lang }))
                .andThen(() => toResult(() => $api.vBookingPurchaseCreate(userId, "1", {
                    date, time, direction, passenger: {
                        ...passenger,
                        passportExpiry: format(passenger.passportExpiry, "dd-MM-yyyy"),
                    }
                }), $_('bookingActions.purchase.error', { locale: $lang })))
                .match({
                    ok: ok => {
                        toast.info($_('bookingActions.purchase.success', { locale: $lang }));
                        redirectSuccess();
                    },
                    err: (e) => {
                        console.error(e);
                        toast.error(e.detail ?? e.type);
                        dialogOpen = false;
                    }
                });
        } else {
            await toResult(() => $api.vBookingPurchaseCreate(userId, "1", {
                date, time, direction, passenger: {
                    ...passenger,
                    passportExpiry: format(passenger.passportExpiry, "dd-MM-yyyy"),
                }
            }), $_('bookingActions.purchase.error', { locale: $lang }))
                .match({
                    ok: ok => {
                        toast.info($_('bookingActions.purchase.success', { locale: $lang }));
                        redirectSuccess();
                    },
                    err: (e) => {
                        console.error(e);
                        toast.error(e.detail ?? e.type);
                        dialogOpen = false;
                    }
                });
        }

        submitting = false;
    }


</script>

<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger on:click={track} class="{buttonVariants({ variant: 'default' })}" disabled={!isValid}>
        <ShoppingBasket class="mr-2 h-4 w-4"/>
        {$_('bookingActions.purchase.trigger', { locale: $lang })}
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>{$_('bookingActions.purchase.title', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        {$_('bookingActions.purchase.requestBefore', { locale: $lang })} <code
                            class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                        {toDisplayDate(date)}, {displayTime(time)}
                    </code> {$_('bookingActions.purchase.requestFrom', { locale: $lang })} <code
                            class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                        {direction === "JToW" ? $_('bookingActions.purchase.johorToWoodlands', { locale: $lang }) : $_('bookingActions.purchase.woodlandsToJohor', { locale: $lang })}
                    </code>{$_('bookingActions.purchase.requestAfter', { locale: $lang })}

                    </p>
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title>{$_('bookingActions.purchase.importantTitle', { locale: $lang })}</Alert.Title>
                        <Alert.Description>
                            {$_('bookingActions.purchase.importantBody', { locale: $lang })}
                        </Alert.Description>
                    </Alert.Root>


                    <div class="my-8">
                        <div class="flex justify-between">
                            <div class="font-bold">{$_('fields.fullName', { locale: $lang })}</div>
                            <div>{passenger.fullName}</div>
                        </div>
                        <div class="flex justify-between">
                            <div class="font-bold">{$_('bookingActions.purchase.passportExpiry', { locale: $lang })}</div>
                            <div>{formatCalendarDate(new Date(passenger.passportExpiry), $lang)}</div>
                        </div>

                        <div class="flex justify-between">
                            <div class="font-bold">{$_('fields.passportNumber', { locale: $lang })}</div>
                            <div>{passenger.passportNumber}</div>
                        </div>

                        <div class="flex justify-between">
                            <div class="font-bold">{$_('fields.gender', { locale: $lang })}</div>
                            <div>{passenger.gender === "M" ? $_('bookingActions.purchase.male', { locale: $lang }) : $_('bookingActions.purchase.female', { locale: $lang })}</div>
                        </div>
                    </div>

                    <Button class="my-2" on:click={buy} disabled={submitting || !isValid}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        {$_('bookingActions.purchase.trigger', { locale: $lang })}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
