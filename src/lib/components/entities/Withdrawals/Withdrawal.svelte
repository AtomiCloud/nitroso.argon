<script lang="ts">

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as HoverCard from "$lib/components/ui/hover-card";
    import type {WithdrawalRes} from "$lib/api/core/data-contracts";
    import {Badge} from "$lib/components/ui/badge";
    import {WITHDRAWAL_STATUS_BADGE} from "../../../../routes/withdrawals/withdrawal_status.js";
    import {page} from "$app/stores";
    import CancelWithdrawal from "$lib/components/entities/Withdrawals/CancelWithdrawal.svelte";
    import RejectWithdrawal from "$lib/components/entities/Withdrawals/RejectWithdrawal.svelte";
    import ApproveWithdrawal from "$lib/components/entities/Withdrawals/ApproveWithdrawal.svelte";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatDate, formatTime, formatDateTime} from "$lib/i18n";

    export let withdrawal: WithdrawalRes;
    export let admin: boolean;


</script>


<div class="flex flex-wrap gap-4">
    <Card.Root class="flex-1">
        <Card.Header>
            <div class="flex flex-wrap justify-between">
                <div>
                    <Card.Title>{$_('withdrawals.card.amountToPayNow', { locale: $lang, values: { amount: formatMoney(withdrawal.principal.record.amount, $lang), payNowNumber: withdrawal.principal.record.payNowNumber } })}</Card.Title>
                    <Card.Description>{withdrawal.principal.id}</Card.Description>
                </div>
                <div>
                    <Badge class="{WITHDRAWAL_STATUS_BADGE[withdrawal.principal.status.status ?? ''].color}">{$_(`withdrawals.status.${withdrawal.principal.status.status ?? ''}`, { locale: $lang })}</Badge>
                </div>
            </div>
        </Card.Header>
        <Card.Content>
            <div class="flex flex-wrap justify-between">
                <div>
                    {$_('withdrawals.card.by', { locale: $lang })}
                    <HoverCard.Root>
                        <HoverCard.Trigger
                                class="hover:underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-black">
                            <a href="/users/{withdrawal.user.id}" class="hover:text-primary transition-colors">
                                @{withdrawal.user.username}
                            </a>
                        </HoverCard.Trigger>
                        <HoverCard.Content class="w-80">
                            <div class="flex justify-between space-x-4">
                                <div class="space-y-1">
                                    <h4 class="text-sm font-semibold">@{withdrawal.user.username}</h4>
                                    <p class="text-sm">{withdrawal.user.id}</p>
                                    <a href="/users/{withdrawal.user.id}" class="text-xs text-primary hover:underline">
                                        {$_('withdrawals.card.viewUserProfile', { locale: $lang })}
                                    </a>
                                </div>
                            </div>
                        </HoverCard.Content>
                    </HoverCard.Root>
                </div>
            </div>
        </Card.Content>
    </Card.Root>
    <Card.Root class="flex w-full lg:flex-1 flex-full justify-center items-center">
        <Card.Header>
            <Card.Title
                    class="text-3xl">{formatDate(withdrawal?.principal?.createAt, $lang)}</Card.Title>
            <Card.Description
                    class="text-center">{formatTime(withdrawal?.principal?.createAt, $lang)}</Card.Description>
        </Card.Header>
    </Card.Root>
</div>
{#if withdrawal.principal.complete == null}
<div>
    <Card.Root>
        <Card.Header>
            <Card.Title>{$_('fields.actions', { locale: $lang })}</Card.Title>
        </Card.Header>
        <Card.Content>
            <div class="flex flex-1 flex-wrap gap-4">
                {#if admin}
                    <ApproveWithdrawal withdrawal={withdrawal.principal}/>
                    <RejectWithdrawal withdrawal={withdrawal.principal}/>
                {/if}
                <CancelWithdrawal withdrawal={withdrawal.principal} userId={withdrawal?.user?.id ?? ''}/>
            </div>
        </Card.Content>

    </Card.Root>
</div>
{/if}
<div>
    {#if withdrawal.principal.complete != null}
        <Card.Root class="flex-1">

            <Card.Header>
                <div class="flex justify-between">
                    <div>
                        <Card.Title>{$_(`withdrawals.status.${withdrawal.principal.status.status ?? ''}`, { locale: $lang })}</Card.Title>
                        <Card.Description>{formatDateTime(withdrawal.principal.complete.completedAt, $lang)}</Card.Description>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        {$_('withdrawals.card.completer', { locale: $lang })}
                        <HoverCard.Root>
                            <HoverCard.Trigger
                                    class="hover:underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-black">
                                <a href="/users/{withdrawal.completer.id}" class="hover:text-primary transition-colors">
                                    @{withdrawal.completer.username}
                                </a>
                            </HoverCard.Trigger>
                            <HoverCard.Content class="w-80">
                                <div class="flex justify-between space-x-4">
                                    <div class="space-y-1">
                                        <h4 class="text-sm font-semibold">@{withdrawal.completer.username}</h4>
                                        <p class="text-sm">{withdrawal.completer.id}</p>
                                        <a href="/users/{withdrawal.completer.id}" class="text-xs text-primary hover:underline">
                                            {$_('withdrawals.card.viewUserProfile', { locale: $lang })}
                                        </a>
                                    </div>
                                </div>
                            </HoverCard.Content>
                        </HoverCard.Root>
                    </div>
                </div>


            </Card.Header>
            <Card.Content>
                <div class="flex flex-col justify-center gap-4">
                    <p>{withdrawal.principal?.complete?.note ?? $_('withdrawals.card.noNote', { locale: $lang })}</p>
                    {#if withdrawal.principal?.complete?.receipt != null}
                        <img src="{withdrawal.principal.complete.receipt}" alt={$_('withdrawals.card.receiptAlt', { locale: $lang })} class="w-full">
                    {/if}
                </div>

            </Card.Content>
        </Card.Root>
    {/if}
</div>
