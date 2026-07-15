<script lang="ts">

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as HoverCard from "$lib/components/ui/hover-card";
    //@ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import type {WithdrawalRes} from "$lib/api/core/data-contracts";
    import {Badge} from "$lib/components/ui/badge";
    import {Button} from "$lib/components/ui/button";
    import {WITHDRAWAL_STATUS_BADGE} from "../../../../routes/withdrawals/withdrawal_status.js";
    import {page} from "$app/stores";
    import CancelWithdrawal from "$lib/components/entities/Withdrawals/CancelWithdrawal.svelte";
    import RejectWithdrawal from "$lib/components/entities/Withdrawals/RejectWithdrawal.svelte";
    import ApproveWithdrawal from "$lib/components/entities/Withdrawals/ApproveWithdrawal.svelte";
    import CompleteWithdrawalManual from "$lib/components/entities/Withdrawals/CompleteWithdrawalManual.svelte";
    import ForceCompleteWithdrawal from "$lib/components/entities/Withdrawals/ForceCompleteWithdrawal.svelte";
    import RequeueWithdrawal from "$lib/components/entities/Withdrawals/RequeueWithdrawal.svelte";
    import WithdrawalPayoutDetails from "$lib/components/entities/Withdrawals/WithdrawalPayoutDetails.svelte";
    import WithdrawalRefunds from "$lib/components/entities/Withdrawals/WithdrawalRefunds.svelte";
    import {cardRefundTitleI18nKey, isCardRefund} from "$lib/components/entities/Withdrawals/withdrawal";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {AlertTriangle, LucideLoader} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatDate, formatTime, formatDateTime} from "$lib/i18n";

    export let withdrawal: WithdrawalRes;
    export let admin: boolean;

    let reconciling = false;

    // Admin escape hatch on "Processing": ask the backend to re-check the
    // payout against Airwallex right now instead of waiting for the next
    // scheduled reconcile pass.
    async function reconcile() {
        reconciling = true;
        await toResult(() => $api.vWithdrawalReconcileCreate(withdrawal.principal.id, "1.0"
        ), $_('withdrawals.reconcile.failed', { locale: $lang })).match({
            ok: () => {
                toast.info($_('withdrawals.reconcile.success', { locale: $lang }));
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        })
        reconciling = false;
    }

</script>


<div class="flex flex-wrap gap-4">
    <Card.Root class="flex-1">
        <Card.Header>
            <div class="flex flex-wrap justify-between">
                <div>
                    <Card.Title>
                        {#if isCardRefund(withdrawal.principal.record)}
                            {$_(cardRefundTitleI18nKey(withdrawal.principal.status.status ?? 'Pending'), {
                                locale: $lang,
                                values: { amount: formatMoney(withdrawal.principal.record.amount, $lang) }
                            })}
                        {:else}
                            {$_('withdrawals.card.amountToPayNow', { locale: $lang, values: { amount: formatMoney(withdrawal.principal.record.amount, $lang), payNowNumber: withdrawal.principal.record.payNowNumber } })}
                        {/if}
                    </Card.Title>
                    <Card.Description>{withdrawal.principal.id}</Card.Description>
                    <div class="pt-1 text-sm text-muted-foreground">
                        {$_(`withdrawals.method.${isCardRefund(withdrawal.principal.record) ? 'CardRefund' : 'PayNow'}`, { locale: $lang })}
                    </div>
                </div>
                <div>
                    <Badge class="{WITHDRAWAL_STATUS_BADGE[withdrawal.principal.status.status ?? ''].color}">{$_(`withdrawals.status.${withdrawal.principal.status.status ?? ''}`, { locale: $lang })}</Badge>
                </div>
            </div>
        </Card.Header>
        <Card.Content>
            {#if withdrawal.principal.payout != null}
                <div class="pb-4">
                    <WithdrawalPayoutDetails payout={withdrawal.principal.payout}/>
                </div>
            {/if}
            {#if admin && withdrawal.principal.status.status === "Processing"}
                <div class="pb-4">
                    <Button variant="outline" size="sm" on:click={reconcile} disabled={reconciling}>
                        {#if reconciling}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        {$_('withdrawals.reconcile.trigger', { locale: $lang })}
                    </Button>
                </div>
            {/if}
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
{#if withdrawal.refunds?.length > 0}
<div>
    <WithdrawalRefunds refunds={withdrawal.refunds}/>
</div>
{/if}
{#if withdrawal.principal.status.status === "Pending"}
<div>
    <Card.Root>
        <Card.Header>
            <Card.Title>{$_('fields.actions', { locale: $lang })}</Card.Title>
        </Card.Header>
        <Card.Content>
            <div class="flex flex-1 flex-wrap gap-4">
                {#if admin}
                    <!-- PayNow payouts (Beta) are not enabled on the Airwallex
                         account: auto-approving a PayNow withdrawal only bounces
                         off the gateway, so the automated rail is offered for
                         card refunds only — PayNow is completed manually with a
                         receipt. Drop this gate when payouts go live. -->
                    {#if isCardRefund(withdrawal.principal.record)}
                        <ApproveWithdrawal withdrawal={withdrawal.principal}/>
                    {/if}
                    <CompleteWithdrawalManual withdrawal={withdrawal.principal}/>
                    <RejectWithdrawal withdrawal={withdrawal.principal}/>
                {/if}
                <CancelWithdrawal withdrawal={withdrawal.principal} userId={withdrawal?.user?.id ?? ''}/>
            </div>
        </Card.Content>

    </Card.Root>
</div>
{/if}
{#if withdrawal.principal.status.status === "RequireManualIntervention"}
<div>
    <Alert.Root variant="destructive">
        <AlertTriangle class="h-4 w-4"/>
        <Alert.Title>{$_('withdrawals.rmi.title', { locale: $lang })}</Alert.Title>
        <Alert.Description>
            <div class="flex flex-col gap-3">
                <p class="text-justify">
                    {$_('withdrawals.rmi.description', { locale: $lang, values: { attempts: withdrawal.principal.payout?.reconcileAttempts ?? 0 } })}
                </p>
                {#if withdrawal.principal.payout?.confirmationNumber}
                    <p>
                        {$_('withdrawals.rmi.confirmationLine', { locale: $lang })}
                        <span class="font-mono font-semibold">{withdrawal.principal.payout.confirmationNumber}</span>
                    </p>
                {:else}
                    <p>{$_('withdrawals.rmi.noConfirmation', { locale: $lang })}</p>
                {/if}
                {#if admin}
                    <p class="text-justify">{$_('withdrawals.rmi.chooseAction', { locale: $lang })}</p>
                    <div class="flex flex-wrap gap-4">
                        <ForceCompleteWithdrawal withdrawal={withdrawal.principal}/>
                        <RejectWithdrawal withdrawal={withdrawal.principal} triggerLabel={$_('withdrawals.rmi.reject', { locale: $lang })}/>
                        <RequeueWithdrawal withdrawal={withdrawal.principal}/>
                    </div>
                {/if}
            </div>
        </Alert.Description>
    </Alert.Root>
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
                    {#if withdrawal.principal.payout != null}
                        <WithdrawalPayoutDetails payout={withdrawal.principal.payout}/>
                    {/if}
                    <p>{withdrawal.principal?.complete?.note ?? $_('withdrawals.card.noNote', { locale: $lang })}</p>
                    {#if withdrawal.principal?.complete?.receipt != null}
                        <img src="{withdrawal.principal.complete.receipt}" alt={$_('withdrawals.card.receiptAlt', { locale: $lang })} class="w-full">
                    {/if}
                </div>

            </Card.Content>
        </Card.Root>
    {/if}
</div>
