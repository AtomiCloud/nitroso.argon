<script lang="ts">
    import {Button, buttonVariants} from "$lib/components/ui/button";

    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import type {WithdrawalPrincipalRes} from "$lib/api/core/data-contracts";
    import {LucideLoader} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang, formatMoney} from "$lib/i18n";

    export let withdrawal: WithdrawalPrincipalRes;

    let dialogOpen = false;

    let submitting = false;

    // Force complete only makes sense when Airwallex actually recorded a
    // transfer — without a confirmation number the money most likely never
    // left, so the button is disabled to prevent marking an unpaid
    // withdrawal as completed.
    $: confirmationNumber = withdrawal.payout?.confirmationNumber ?? null;

    // Marks the withdrawal as completed WITHOUT sending any money — for when
    // the admin has verified in the Airwallex dashboard that the transfer
    // already went through but the automated reconciliation could not
    // confirm it.
    async function forceComplete() {
        submitting = true;
        await toResult(() => $api.vWithdrawalCompletePayoutCreate(withdrawal.id, "1.0"
        ), $_('withdrawals.rmi.forceComplete.failed', { locale: $lang })).match({
            ok: () => {
                toast.info($_('withdrawals.rmi.forceComplete.success', { locale: $lang, values: { amount: formatMoney(withdrawal.record?.amount ?? 0, $lang) } }));
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
</script>
{#if confirmationNumber}
    <Dialog.Root bind:open={dialogOpen}>
        <Dialog.Trigger class="w-full lg:max-w-40  {buttonVariants({ variant: 'default' })}">
            {$_('withdrawals.rmi.forceComplete.trigger', { locale: $lang })}
        </Dialog.Trigger>
        <Dialog.Content>
            <Dialog.Header>
                <Dialog.Title>{$_('withdrawals.rmi.forceComplete.title', { locale: $lang })}</Dialog.Title>
                <Dialog.Description>
                    <div class="flex flex-col gap-4">
                        <p class="text-justify py-2">
                            {$_('withdrawals.rmi.forceComplete.instructions', { locale: $lang, values: { amount: formatMoney(withdrawal.record.amount, $lang), payNowNumber: withdrawal.record.payNowNumber, confirmationNumber } })}
                        </p>
                        <Button on:click={forceComplete} disabled={submitting === true}>
                            {#if submitting}
                                <LucideLoader class="mr-2 h-4 w-4 animate-spin" />
                            {/if}
                            {$_('withdrawals.rmi.forceComplete.trigger', { locale: $lang })}
                        </Button>
                    </div>
                </Dialog.Description>
            </Dialog.Header>
        </Dialog.Content>
    </Dialog.Root>
{:else}
    <Button class="w-full lg:max-w-40" disabled title={$_('withdrawals.rmi.forceComplete.disabledHint', { locale: $lang })}>
        {$_('withdrawals.rmi.forceComplete.trigger', { locale: $lang })}
    </Button>
{/if}
