<script lang="ts">
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    import type {WithdrawalRefundRes} from "$lib/api/core/data-contracts";
    import {Badge} from "$lib/components/ui/badge";
    import {toast} from "svelte-sonner";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatDateTime} from "$lib/i18n";
    import {REFUND_STATUS_BADGE, shortenId} from "./withdrawal";

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
                <li class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
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
                </li>
            {/each}
        </ul>
    </Card.Content>
</Card.Root>
