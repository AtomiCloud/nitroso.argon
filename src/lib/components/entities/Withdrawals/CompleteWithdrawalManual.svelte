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

    let files: FileList;

    let submitting = false;

    // Manual fallback when Airwallex payouts are unavailable: the admin
    // transfers via PayNow themselves and uploads the receipt screenshot.
    async function completeWithdrawal(file: File) {
        submitting = true;
        await toResult(() => $api.vWithdrawalCompleteCreate(withdrawal.id, "1.0", {file}
        ), $_('withdrawals.completeManual.failed', { locale: $lang })).match({
            ok: () => {
                toast.info($_('withdrawals.completeManual.success', { locale: $lang, values: { amount: formatMoney(withdrawal.record?.amount ?? 0, $lang) } }));
                dialogOpen = false;
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail);
            }
        })
        submitting = false;
    }
</script>
<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger class="w-full lg:max-w-72  {buttonVariants({ variant: 'outline' })}">
        {$_('withdrawals.completeManual.trigger', { locale: $lang })}
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>{$_('withdrawals.completeManual.title', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        {$_('withdrawals.completeManual.instructions', { locale: $lang, values: { amount: formatMoney(withdrawal.record.amount, $lang), payNowNumber: withdrawal.record.payNowNumber } })}
                    </p>
                    <Button variant="outline">
                        <input  bind:files type="file"/>
                    </Button>
                    <Button on:click={() => completeWithdrawal(files[0])} disabled={submitting === true}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin" />
                        {/if}
                        {$_('withdrawals.completeManual.complete', { locale: $lang })}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
