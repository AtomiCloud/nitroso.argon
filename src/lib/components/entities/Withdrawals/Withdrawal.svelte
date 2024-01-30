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

    export let withdrawal: WithdrawalRes;
    export let admin: boolean;


</script>


<div class="flex flex-wrap gap-4">
    <Card.Root class="flex-1">
        <Card.Header>
            <div class="flex flex-wrap justify-between">
                <div>
                    <Card.Title>S${withdrawal.principal.record.amount} to
                        PayNow {withdrawal.principal.record.payNowNumber}</Card.Title>
                    <Card.Description>{withdrawal.principal.id}</Card.Description>
                </div>
                <div>
                    <Badge class="{WITHDRAWAL_STATUS_BADGE[withdrawal.principal.status.status ?? ''].color}">{WITHDRAWAL_STATUS_BADGE[withdrawal.principal.status.status ?? ''].display}</Badge>
                </div>
            </div>
        </Card.Header>
        <Card.Content>
            <div class="flex flex-wrap justify-between">
                <div>
                    By
                    <HoverCard.Root>
                        <HoverCard.Trigger
                                class="hover:underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-black">
                            @{withdrawal.user.username}
                        </HoverCard.Trigger>
                        <HoverCard.Content class="w-80">
                            <div class="flex justify-between space-x-4">
                                <div class="space-y-1">
                                    <h4 class="text-sm font-semibold">@{withdrawal.user.username}</h4>
                                    <p class="text-sm">{withdrawal.user.id}</p>
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
                    class="text-3xl">{new Date(withdrawal?.principal?.createAt).toLocaleDateString(undefined, {dateStyle: "medium"})}</Card.Title>
            <Card.Description
                    class="text-center">{new Date(withdrawal?.principal?.createAt).toLocaleTimeString(undefined, {timeStyle: "medium"})}</Card.Description>
        </Card.Header>
    </Card.Root>
</div>
{#if withdrawal.principal.complete == null}
<div>
    <Card.Root>
        <Card.Header>
            <Card.Title>Actions</Card.Title>
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
                        <Card.Title>{WITHDRAWAL_STATUS_BADGE[withdrawal.principal.status.status ?? ""].display}</Card.Title>
                        <Card.Description>{new Date(withdrawal.principal.complete.completedAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "medium"
                        })}</Card.Description>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        Completer
                        <HoverCard.Root>
                            <HoverCard.Trigger
                                    class="hover:underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-black">
                                @{withdrawal.completer.username}
                            </HoverCard.Trigger>
                            <HoverCard.Content class="w-80">
                                <div class="flex justify-between space-x-4">
                                    <div class="space-y-1">
                                        <h4 class="text-sm font-semibold">@{withdrawal.completer.username}</h4>
                                        <p class="text-sm">{withdrawal.completer.id}</p>
                                    </div>
                                </div>
                            </HoverCard.Content>
                        </HoverCard.Root>
                    </div>
                </div>


            </Card.Header>
            <Card.Content>
                <div class="flex flex-col justify-center gap-4">
                    <p>{withdrawal.principal?.complete?.note ?? "No Note"}</p>
                    {#if withdrawal.principal?.complete?.receipt != null}
                        <img src="{withdrawal.principal.complete.receipt}" alt="receipt" class="w-full">
                    {/if}
                </div>

            </Card.Content>
        </Card.Root>
    {/if}
</div>
