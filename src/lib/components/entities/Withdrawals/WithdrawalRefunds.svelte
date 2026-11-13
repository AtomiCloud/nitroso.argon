<script lang="ts">
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    import type {WithdrawalRefundRes} from "$lib/api/core/data-contracts";
    import {Badge} from "$lib/components/ui/badge";
    import {toast} from "svelte-sonner";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatDateTime} from "$lib/i18n";
    import {
        REFUND_SLOW_DAYS,
        REFUND_STATUS_BADGE,
        REFUND_TYPICAL_DAYS,
        refundProgress,
        shortenId,
        sliceError,
    } from "./withdrawal";

    // the three steps of a card refund's journey, in order; a step is done
    // when the slice has reached a later one, current when it sits on it
    const STEPS = ['requested', 'accepted', 'settled'] as const;
    const STEP_LABEL = {
        requested: 'withdrawals.refunds.progress.stepRequested',
        accepted: 'withdrawals.refunds.progress.stepAccepted',
        settled: 'withdrawals.refunds.progress.stepSettled',
    } as const;

    // Card-refund evidence: one row per refund fragment zinc created against a
    // funding payment intent (fragmented oldest-first), so the user can see
    // exactly where each slice of the money went. Rows stack on mobile — no
    // horizontal scroll.
    export let refunds: WithdrawalRefundRes[];

    async function copyId(id: string) {
        try {
            await navigator.clipboard.writeText(id);
            toast.info($_('withdrawals.refunds.copied', { locale: $lang }));
        } catch (e) {
            console.error(e);
        }
    }
</script>

<Card.Root>
    <Card.Header>
        <Card.Title>{$_('withdrawals.refunds.title', { locale: $lang })}</Card.Title>
        <Card.Description>{$_('withdrawals.refunds.description', { locale: $lang })}</Card.Description>
    </Card.Header>
    <Card.Content>
        <ul class="flex flex-col divide-y">
            {#each refunds as r}
                {@const lastError = sliceError(r)}
                {@const progress = refundProgress(r)}
                {@const at = STEPS.indexOf(progress.stage === 'failed' ? 'requested' : progress.stage)}
                <li class="flex flex-col gap-2 py-3">
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex flex-col gap-1 text-sm min-w-0">
                            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span class="text-muted-foreground">{$_('withdrawals.refunds.payment', { locale: $lang })}</span>
                                <button type="button"
                                        class="font-mono hover:underline underline-offset-4"
                                        title={r.paymentIntentId}
                                        on:click={() => copyId(r.paymentIntentId)}>
                                    {shortenId(r.paymentIntentId)}
                                </button>
                            </div>
                            {#if r.airwallexRefundId}
                                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span class="text-muted-foreground">{$_('withdrawals.refunds.refundId', { locale: $lang })}</span>
                                    <button type="button"
                                            class="font-mono hover:underline underline-offset-4"
                                            title={r.airwallexRefundId}
                                            on:click={() => copyId(r.airwallexRefundId ?? '')}>
                                        {shortenId(r.airwallexRefundId)}
                                    </button>
                                </div>
                            {/if}
                            {#if r.settledAt}
                                <div class="text-xs text-muted-foreground">
                                    {$_('withdrawals.refunds.settledAt', { locale: $lang, values: { at: formatDateTime(r.settledAt, $lang) } })}
                                </div>
                            {/if}
                        </div>
                        <div class="flex items-center gap-3 shrink-0">
                            <span class="font-semibold tabular-nums">{formatMoney(r.amount, $lang)}</span>
                            <Badge class="{REFUND_STATUS_BADGE[r.status] ?? ''}">
                                {$_(`withdrawals.refunds.status.${r.status}`, { locale: $lang })}
                            </Badge>
                        </div>
                    </div>
                    {#if r.airwallexRefundId && (progress.stage === 'requested' || progress.stage === 'accepted')}
                        <!-- Progress indicator: where this pending slice is on its way to the card, how
                             long it has waited vs. how long card refunds normally take, and the bank
                             reference to trace it by. Pending for a few days is normal, not stuck. -->
                        <div class="flex flex-col gap-2 rounded-md border bg-muted/40 p-3 text-xs">
                            <ol class="flex items-center gap-1" aria-label={$_('withdrawals.refunds.title', { locale: $lang })}>
                                {#each STEPS as step, i}
                                    <li class="flex items-center gap-1 {i < STEPS.length - 1 ? 'flex-1' : ''}"
                                        aria-current={i === at ? 'step' : undefined}>
                                        <span class="relative flex h-3 w-3 shrink-0 items-center justify-center">
                                            {#if i === at}
                                                <span class="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60 motion-safe:animate-ping"></span>
                                            {/if}
                                            <span class="relative inline-flex h-3 w-3 rounded-full
                                                {i < at ? 'bg-green-500' : i === at ? 'bg-amber-500' : 'border border-muted-foreground/40 bg-background'}"></span>
                                        </span>
                                        <span class="min-w-0 break-words leading-tight {i <= at ? 'font-medium' : 'text-muted-foreground'}">
                                            {$_(STEP_LABEL[step], { locale: $lang })}
                                        </span>
                                        {#if i < STEPS.length - 1}
                                            <span class="mx-1 h-px min-w-2 flex-1 {i < at ? 'bg-green-500' : 'bg-muted-foreground/30'}"></span>
                                        {/if}
                                    </li>
                                {/each}
                            </ol>
                            <p class={progress.slow ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
                                {#if progress.slow}
                                    {$_(r.acquirerReferenceNumber ? 'withdrawals.refunds.progress.waitingSlow' : 'withdrawals.refunds.progress.waitingSlowNoArn', { locale: $lang, values: { days: progress.daysWaiting } })}
                                {:else}
                                    {$_('withdrawals.refunds.progress.waiting', { locale: $lang, values: { days: progress.daysWaiting + 1, typical: REFUND_TYPICAL_DAYS, slow: REFUND_SLOW_DAYS } })}
                                {/if}
                            </p>
                            {#if r.acquirerReferenceNumber}
                                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span class="text-muted-foreground">{$_('withdrawals.refunds.progress.arn', { locale: $lang })}</span>
                                    <button type="button"
                                            class="font-mono break-all text-left hover:underline underline-offset-4"
                                            title={r.acquirerReferenceNumber}
                                            on:click={() => copyId(r.acquirerReferenceNumber ?? '')}>
                                        {r.acquirerReferenceNumber}
                                    </button>
                                </div>
                            {/if}
                            <p class="text-muted-foreground">
                                {#if r.gatewayCheckedAt}
                                    {$_('withdrawals.refunds.progress.checkedAt', { locale: $lang, values: { at: formatDateTime(r.gatewayCheckedAt, $lang) } })}
                                {:else}
                                    {$_('withdrawals.refunds.progress.notChecked', { locale: $lang })}
                                {/if}
                            </p>
                        </div>
                    {/if}
                    {#if lastError}
                        <p class="text-xs text-destructive break-words whitespace-pre-wrap">
                            {$_('withdrawals.refunds.lastError', { locale: $lang, values: { message: lastError } })}
                        </p>
                    {/if}
                </li>
            {/each}
        </ul>
    </Card.Content>
</Card.Root>
