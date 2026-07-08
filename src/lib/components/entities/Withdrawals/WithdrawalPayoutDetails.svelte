<script lang="ts">
    import type {WithdrawalPayoutRes} from "$lib/api/core/data-contracts";
    import {_} from "svelte-i18n";
    import {lang, formatMoney} from "$lib/i18n";

    export let payout: WithdrawalPayoutRes;
    // compact renders the block in the smaller, muted style used by list cards
    export let compact = false;
</script>

<div class="flex flex-col gap-1 {compact ? 'text-sm text-muted-foreground' : ''}">
    {#if payout.confirmationNumber}
        <div>
            {$_('withdrawals.card.confirmationNo', { locale: $lang })}
            <span class="font-mono">{payout.confirmationNumber}</span>
        </div>
    {/if}
    <div>
        {$_('withdrawals.card.fee', { locale: $lang })}
        {formatMoney(payout.fee, $lang)}
    </div>
    {#if payout.reconcileAttempts > 0}
        <div class="text-sm text-muted-foreground">
            {$_('withdrawals.card.reconcileAttempts', { locale: $lang, values: { count: payout.reconcileAttempts } })}
        </div>
    {/if}
</div>
