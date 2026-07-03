<script lang="ts">
    import {Button, buttonVariants} from "$lib/components/ui/button";

    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    //@ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import type {WithdrawalPrincipalRes} from "$lib/api/core/data-contracts";
    import {Input} from "$lib/components/ui/input";
    import {LucideLoader} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang, formatMoney} from "$lib/i18n";

    export let withdrawal: WithdrawalPrincipalRes;

    let dialogOpen = false;

    let files: FileList;

    let submitting = false;

    async function approveWithdrawal(file: File) {
        submitting = true;
        await toResult(() => $api.vWithdrawalCompleteCreate(withdrawal.id, "1.0", {file}
        ), $_('withdrawals.approve.failed', { locale: $lang })).match({
            ok: () => {
                toast.info($_('withdrawals.approve.success', { locale: $lang, values: { amount: formatMoney(withdrawal.record?.amount ?? 0, $lang) } }));
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
    <Dialog.Trigger class="w-full lg:max-w-40  {buttonVariants({ variant: 'default' })}">
        {$_('actions.approve', { locale: $lang })}
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>{$_('withdrawals.approve.title', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        {$_('withdrawals.approve.instructions', { locale: $lang, values: { amount: formatMoney(withdrawal.record.amount, $lang), payNowNumber: withdrawal.record.payNowNumber } })}
                    </p>
                    <Button variant="outline">
                        <input  bind:files type="file"/>
                    </Button>
                    <Button on:click={() => approveWithdrawal(files[0])} disabled={submitting === true}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin" />
                        {/if}
                        {$_('withdrawals.approve.complete', { locale: $lang })}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
