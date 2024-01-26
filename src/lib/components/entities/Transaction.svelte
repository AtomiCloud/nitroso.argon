<script lang="ts">

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    import type {TransactionRes} from "$lib/api/core/data-contracts";
    import { Badge } from "$lib/components/ui/badge";
    import {ArrowRight} from "lucide-svelte";
    import {Button} from "$lib/components/ui/button";

    export let transaction: TransactionRes

    export let walletLink: string | undefined;
    export let userLink: string | undefined;


    $: wl = walletLink ?? `/wallets/${transaction.wallet?.id}`;
    $: ul = userLink ?? `/users/${transaction.wallet?.userId}`;
</script>


<div class="flex flex-wrap gap-4">
    <Card.Root class="flex-3">
        <Card.Header>
            <div class="flex flex-wrap justify-between">
                <div>
                    <Card.Title>{transaction.principal.name}</Card.Title>
                    <Card.Description>{transaction.principal.id}</Card.Description>
                </div>
                <div>
                    <Badge>{transaction.principal.transactionType}</Badge>
                </div>
            </div>
        </Card.Header>
        <Card.Content>
            {transaction.principal.description}
        </Card.Content>
    </Card.Root>
    <Card.Root class="flex-1 flex justify-center items-center">
        <Card.Header>
            <Card.Title class="flex gap-4">
                <Badge>
                    {transaction.principal.from}
                </Badge>
                <ArrowRight />
                <Badge>
                    {transaction.principal.to}
                </Badge>
            </Card.Title>
            <Card.Description class="text-center">Transaction Direction</Card.Description>
        </Card.Header>
    </Card.Root>
</div>
<div class="flex flex-wrap gap-4">


    <Card.Root class="flex-1 flex justify-center items-center">
        <Card.Header>
            <Card.Title class="text-3xl">SGD {transaction.principal.amount.toFixed(2)}</Card.Title>
            <Card.Description class="text-center">Transaction Amount</Card.Description>
        </Card.Header>
    </Card.Root>
    <Card.Root class="flex-1 flex justify-center items-center">
        <Card.Header>
            <Card.Title class="text-3xl">{new Date(transaction.principal.createdAt).toLocaleDateString(undefined, {dateStyle: "medium"})}</Card.Title>
            <Card.Description class="text-center">{new Date(transaction.principal.createdAt).toLocaleTimeString(undefined, {timeStyle: "medium"})}</Card.Description>
        </Card.Header>
    </Card.Root>
    <Card.Root class="flex-1">
        <Card.Header class="w-full">
            <Card.Title class="text-center">Related</Card.Title>
        </Card.Header>
        <Card.Content>
            <div class="flex gap-4 w-full justify-center">
                <Button class="w-24" href="{wl}">Wallet</Button>
                <Button class="w-24" href="{ul}">User</Button>
            </div>
        </Card.Content>
    </Card.Root>
</div>

