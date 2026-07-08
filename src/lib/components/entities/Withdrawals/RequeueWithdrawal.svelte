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

    // Retries the automated Airwallex payout from scratch. DANGEROUS if the
    // original transfer actually went through — the user would be paid
    // twice — hence the explicit confirmation dialog with a double-pay
    // warning. Only for cases verified in Airwallex as "no money left".
    async function requeueWithdrawal() {
        submitting = true;
        await toResult(() => $api.vWithdrawalRequeueCreate(withdrawal.id, "1.0"
        ), $_('withdrawals.rmi.requeue.failed', { locale: $lang })).match({
            ok: () => {
                toast.info($_('withdrawals.rmi.requeue.success', { locale: $lang, values: { amount: formatMoney(withdrawal.record?.amount ?? 0, $lang) } }));
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
<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger class="w-full lg:max-w-40  {buttonVariants({ variant: 'outline' })}">
        {$_('withdrawals.rmi.requeue.trigger', { locale: $lang })}
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>{$_('withdrawals.rmi.requeue.title', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2 text-destructive font-medium">
                        {$_('withdrawals.rmi.requeue.warning', { locale: $lang, values: { amount: formatMoney(withdrawal.record.amount, $lang), payNowNumber: withdrawal.record.payNowNumber } })}
                    </p>
                    <Button variant="destructive" on:click={requeueWithdrawal} disabled={submitting === true}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin" />
                        {/if}
                        {$_('withdrawals.rmi.requeue.confirm', { locale: $lang })}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
