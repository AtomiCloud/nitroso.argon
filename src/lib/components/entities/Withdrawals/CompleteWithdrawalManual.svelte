<script lang="ts">
    import {Button, buttonVariants} from "$lib/components/ui/button";

    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    import {toResult} from "$lib/utility";
    import {loadWithdrawFeeRate, roundToEvenCents} from "$lib/api/fee";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import type {WithdrawalPrincipalRes} from "$lib/api/core/data-contracts";
    import {LucideLoader} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang, formatMoney} from "$lib/i18n";

    export let withdrawal: WithdrawalPrincipalRes;

    let dialogOpen = false;

    let files: FileList | null = null;

    let submitting = false;

    // The backend books every completion as net + fee (net paid out, fee kept),
    // so the admin must PayNow the NET amount — never the gross record amount.
    // Prefer the exact fee snapshotted on the withdrawal by a prior approval;
    // otherwise compute it from the live fee rate. If neither is available the
    // net is unknown and submission is blocked to prevent overpaying the user.
    let feeRate: number | null = null;
    let feeRequested = false;
    let feeLoadFailed = false;

    $: file = files?.[0] ?? null;

    $: snapshotFee = withdrawal.payout?.fee ?? null;

    $: if (dialogOpen && !feeRequested && snapshotFee == null) {
        feeRequested = true;
        loadFeeRate();
    }

    async function loadFeeRate() {
        feeLoadFailed = false;
        feeRate = await loadWithdrawFeeRate($api, $_('withdrawals.completeManual.feeLoadFailed', { locale: $lang }));
        feeLoadFailed = feeRate == null;
    }

    // banker's rounding to match zinc's FeeCalculator cent-for-cent — a
    // half-up fee could differ by one cent and overpay the user
    $: amount = withdrawal.record.amount;
    $: fee = snapshotFee ?? (feeRate != null ? roundToEvenCents(amount * feeRate) : null);
    $: net = fee != null ? roundToEvenCents(amount - fee) : null;

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
                        {$_('withdrawals.completeManual.instructions', { locale: $lang })}
                    </p>
                    <div class="flex flex-col gap-1 text-sm">
                        <div>{$_('withdrawals.completeManual.amountLine', { locale: $lang, values: { amount: formatMoney(amount, $lang) } })}</div>
                        {#if fee != null && net != null}
                            <!-- a resolved fee of exactly 0 (snapshot 0 or rate 0) means the
                                 fee is disabled: net == gross, so the fee line is skipped and
                                 the admin transfers the full amount; submission stays enabled
                                 because the net IS known -->
                            {#if fee !== 0}
                                <div>{$_('withdrawals.completeManual.feeLine', { locale: $lang, values: { fee: formatMoney(fee, $lang) } })}</div>
                            {/if}
                            <div class="font-bold">{$_('withdrawals.completeManual.transferExactly', { locale: $lang, values: { net: formatMoney(net, $lang), payNowNumber: withdrawal.record.payNowNumber } })}</div>
                        {:else if feeLoadFailed}
                            <div class="text-destructive">{$_('withdrawals.completeManual.feeUnavailable', { locale: $lang })}</div>
                            <Button variant="outline" size="sm" class="self-start" on:click={loadFeeRate}>
                                {$_('actions.retry', { locale: $lang })}
                            </Button>
                        {:else}
                            <div class="flex items-center gap-2 text-muted-foreground">
                                <LucideLoader class="h-4 w-4 animate-spin"/>
                                {$_('withdrawals.completeManual.feeLoading', { locale: $lang })}
                            </div>
                        {/if}
                    </div>
                    <Button variant="outline">
                        <input  bind:files type="file"/>
                    </Button>
                    <Button on:click={() => file && completeWithdrawal(file)} disabled={submitting || net == null || !file}>
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
