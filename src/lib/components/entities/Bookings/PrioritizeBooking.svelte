<script lang="ts">
    import {onMount} from "svelte";
    import {page} from "$app/stores";
    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {LucideLoader, Zap} from "lucide-svelte";

    // @ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    import type {BookingPrincipalRes, PriorityEligibilityRes} from "$lib/api/core/data-contracts";
    import {api} from "../../../../store";
    import {toResult} from "$lib/utility";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {_} from "svelte-i18n";
    import {lang, formatMoney} from "$lib/i18n";

    // "Upgrade to priority" for a Pending, non-priority booking. Renders
    // nothing until zinc confirms the CALLING user is eligible right now
    // (GET Booking/priority/eligibility) — a failed read degrades to hidden.
    export let booking: BookingPrincipalRes;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $: session = $page.data.session as any;

    let eligibility: PriorityEligibilityRes | null = null;

    async function loadEligibility() {
        await toResult(() => $api.vBookingPriorityEligibilityDetail("1"),
            $_('bookingActions.priority.error', { locale: $lang })).match({
            ok: (e: PriorityEligibilityRes) => {
                eligibility = e;
            },
            err: (e) => {
                console.error(e);
            }
        });
    }

    onMount(() => {
        if (booking.status === "Pending" && !booking.priority) loadEligibility();
    });

    $: show = booking.status === "Pending" && !booking.priority && eligibility?.eligible === true;

    let dialogOpen = false;
    let submitting = false;

    async function prioritize() {
        submitting = true;
        // same owner-or-admin scoping as the other booking actions
        const query = session?.roles?.includes("admin")
            ? {userId: booking.userId ?? undefined}
            : {userId: $page.data.user?.principal?.id ?? ""};
        await toResult(() => $api.vBookingPrioritizeCreate(booking.id, "1", query),
            $_('bookingActions.priority.error', { locale: $lang })).match({
            ok: () => {
                toast.success($_('bookingActions.priority.success', { locale: $lang }));
                dialogOpen = false;
                // refreshes the booking (priority flag + badge) and, via the
                // reload, the queue position
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        });
        submitting = false;
    }
</script>

{#if show && eligibility != null}
    <!-- free:true (zinc PR #37) = this user boosts free: every fee mention
         swaps to the "free" copy and no charge is implied -->
    {@const free = eligibility.free === true}
    <Dialog.Root bind:open={dialogOpen}>
        <Dialog.Trigger class="{buttonVariants({ variant: 'outline' })} w-full sm:max-w-60">
            <Zap class="mr-2 h-4 w-4 text-amber-500"/>
            {#if free}
                {$_('bookingActions.priority.upgradeTriggerFree', { locale: $lang })}
            {:else}
                {$_('bookingActions.priority.upgradeTrigger', { locale: $lang, values: { fee: formatMoney(eligibility.fee, $lang) } })}
            {/if}
        </Dialog.Trigger>
        <Dialog.Content>
            <Dialog.Header>
                <Dialog.Title>{$_('bookingActions.priority.upgradeTitle', { locale: $lang })}</Dialog.Title>
                <Dialog.Description>
                    <div class="flex flex-col gap-4">
                        <p class="text-justify py-2">
                            {#if free}
                                {$_('bookingActions.priority.upgradeBodyFree', { locale: $lang })}
                            {:else}
                                {$_('bookingActions.priority.upgradeBody', { locale: $lang, values: { fee: formatMoney(eligibility.fee, $lang) } })}
                            {/if}
                        </p>
                        <Button class="my-2" on:click={prioritize} disabled={submitting}>
                            {#if submitting}
                                <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                            {/if}
                            {#if free}
                                {$_('bookingActions.priority.upgradeConfirmFree', { locale: $lang })}
                            {:else}
                                {$_('bookingActions.priority.upgradeConfirm', { locale: $lang, values: { fee: formatMoney(eligibility.fee, $lang) } })}
                            {/if}
                        </Button>
                    </div>
                </Dialog.Description>
            </Dialog.Header>
        </Dialog.Content>
    </Dialog.Root>
{/if}
