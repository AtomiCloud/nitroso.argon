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
    import {goto, invalidate} from "$app/navigation";
    import {format, parse} from "date-fns";
    import type {ZodIssue} from "zod";
    import {_} from "svelte-i18n";
    import {lang, formatCalendarDate, formatClockTime} from "$lib/i18n";
    import type {CostSummaryRes} from "$lib/api/core/data-contracts";
    import {LIVE_PRICING_DEPENDENCY, sameQuotedPrice} from "$lib/api/cost";


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

    // priority queue opt-in: when true, POST Booking/{id}/prioritize right
    // after a successful purchase; the fee is part of the balance gate so the
    // follow-up call cannot fail on funds
    export let priority = false;
    export let priorityFee = 0;

    let dialogOpen = false;

    let submitting = false;

    function redirectSuccess() {
        goto(`/bookings/purchase/success?date=${date}&time=${time}&direction=${direction}&userId=${userId}&name=${passenger.fullName}&passport=${passenger.passportNumber}`);
    }


    $: isValid = errors.length === 0 && Object.entries(taints).length > 0 && wallet >= cost + (priority ? priorityFee : 0);

    // The booking exists even when the prioritize call fails — tell the user
    // they keep their spot and can upgrade later from the booking page.
    async function prioritize(bookingId: string) {
        await toResult(() => $api.vBookingPrioritizeCreate(bookingId, "1", {userId}),
            $_('bookingActions.priority.error', { locale: $lang })).match({
            ok: () => {
                toast.success($_('bookingActions.priority.success', { locale: $lang }));
            },
            err: (e) => {
                console.error(e);
                toast.error($_('bookingActions.priority.failedAfterPurchase', { locale: $lang }));
            }
        });
    }

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

    // The quote can cross a strict lead-time boundary while the confirmation
    // dialog is open. Re-read it immediately before any passenger or booking
    // mutation; if it changed, refresh the page quote and require a fresh
    // confirmation instead of silently charging a different amount.
    async function quoteIsCurrent(): Promise<boolean> {
        let latest: CostSummaryRes | null = null;
        let failed = false;
        await toResult(() => $api.vCostSummaryDetail("1", {
            Date: date,
            Time: time,
            Direction: direction,
        }), $_('bookingActions.purchase.error', { locale: $lang })).match({
            ok: (summary: CostSummaryRes) => {
                latest = summary;
            },
            err: (e) => {
                console.error(e);
                failed = true;
                toast.error(e.detail ?? e.type);
            }
        });

        if (failed || latest == null) return false;
        if (sameQuotedPrice(cost, latest.final)) return true;

        dialogOpen = false;
        toast.warning($_('bookingActions.purchase.priceChanged', { locale: $lang }));
        await invalidate(LIVE_PRICING_DEPENDENCY);
        return false;
    }

    async function buy() {
        submitting = true;
        (window as any)?.fathom?.trackEvent('Buy')
        if (!await quoteIsCurrent()) {
            submitting = false;
            return;
        }
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
                    ok: async (b) => {
                        toast.info($_('bookingActions.purchase.success', { locale: $lang }));
                        if (priority) await prioritize(b.id);
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
                    ok: async (b) => {
                        toast.info($_('bookingActions.purchase.success', { locale: $lang }));
                        if (priority) await prioritize(b.id);
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
