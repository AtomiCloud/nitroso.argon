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
    import {isCardRefund} from "./withdrawal";
    import {_} from "svelte-i18n";
    import {lang, formatMoney} from "$lib/i18n";

    export let withdrawal: WithdrawalPrincipalRes;

    let dialogOpen = false;

    let submitting = false;

    // Triggers the automated Airwallex payout for the net amount (amount −
    // fee): a PayNow transfer, or — for CardRefund withdrawals — refunds
    // fragmented oldest-first across the funding card payments. The withdrawal
    // moves to "Processing" and completes automatically once Airwallex
    // confirms via webhook.
    async function approveWithdrawal() {
        submitting = true;
        await toResult(() => $api.vWithdrawalApproveCreate(withdrawal.id, "1.0"
        ), $_('withdrawals.approve.failed', { locale: $lang })).match({
            ok: () => {
                // PayNow and CardRefund share the trigger button but produce
                // very different honesty: PayNow is a one-shot transfer;
                // CardRefund is INITIATED here — funds only land when
                // Airwallex settles every fragment, which can take days.
                const successKey = isCardRefund(withdrawal.record)
                    ? 'withdrawals.approve.successCard'
                    : 'withdrawals.approve.success';
                toast.info($_(successKey, { locale: $lang, values: { amount: formatMoney(withdrawal.record?.amount ?? 0, $lang) } }));
                dialogOpen = false;
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                // 409 insufficient_refundable_pool: the pool shrank (e.g. a
                // funding payment aged out of the window) between request and
                // approval — surface the concrete numbers instead of the raw
                // detail string
                const pool = e.data as unknown as { required?: number; available?: number } | undefined;
                if (e.type?.includes("insufficient_refundable_pool") && pool?.required != null && pool?.available != null) {
                    toast.error($_('withdrawals.approve.poolShrank', {
                        locale: $lang,
                        values: {
                            required: formatMoney(pool.required, $lang),
                            available: formatMoney(pool.available, $lang),
                        },
                    }));
                } else {
                    toast.error(e.detail);
                }
            }
        })
        submitting = false;
    }
</script>
<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger class="w-full lg:max-w-56  {buttonVariants({ variant: 'default' })}">
        {$_('withdrawals.approve.trigger', { locale: $lang })}
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>{$_('withdrawals.approve.title', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        {#if isCardRefund(withdrawal.record)}
                            {$_('withdrawals.approve.instructionsCard', { locale: $lang, values: { amount: formatMoney(withdrawal.record.amount, $lang) } })}
                        {:else}
                            {$_('withdrawals.approve.instructions', { locale: $lang, values: { amount: formatMoney(withdrawal.record.amount, $lang), payNowNumber: withdrawal.record.payNowNumber } })}
                        {/if}
                    </p>
                    <Button on:click={approveWithdrawal} disabled={submitting === true}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin" />
                        {/if}
                        {$_('actions.approve', { locale: $lang })}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
