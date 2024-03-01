<script lang="ts">
    import type {UserPrincipalRes, WalletPrincipalRes} from "$lib/api/core/data-contracts";
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Table from "$lib/components/ui/table";
    import AdminIn from "$lib/components/entities/Wallets/AdminIn.svelte";
    import AdminOut from "$lib/components/entities/Wallets/AdminOut.svelte";
    import Promo from "$lib/components/entities/Wallets/Promo.svelte";
    import {Button} from "$lib/components/ui/button";
    import {CircleDollarSign} from "lucide-svelte";

    export let user: UserPrincipalRes;
    export let wallet: WalletPrincipalRes;

    export let admin: boolean = false;

</script>


<Card.Root>
    <Card.Header>
        <div class="flex justify-between flex-wrap gap-4">
            <div>
                <Card.Title>{user.username}</Card.Title>
                <Card.Description class="break-all">{user.id}</Card.Description>
            </div>
            <Button class="w-full sm:max-w-40 " href="/wallets/deposit">
                <CircleDollarSign class="h-4 w-4 mr-2"/>
                Deposit
            </Button>
        </div>
    </Card.Header>
    <Card.Content>
        <Table.Root>
            <Table.Header>
                <Table.Row>
                    <Table.Head>Account</Table.Head>
                    <Table.Head>Amount</Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                <Table.Row>
                    <Table.Cell>USABLE</Table.Cell>
                    <Table.Cell>SGD {wallet.usable.toFixed(2)}</Table.Cell>
                </Table.Row>
                <Table.Row>
                    <Table.Cell>BOOKING RESERVE</Table.Cell>
                    <Table.Cell>SGD {wallet.bookingReserve.toFixed(2)}</Table.Cell>
                </Table.Row>
                <Table.Row>
                    <Table.Cell>WITHDRAW RESERVE</Table.Cell>
                    <Table.Cell>SGD {wallet.withdrawReserve.toFixed(2)}</Table.Cell>
                </Table.Row>
            </Table.Body>
        </Table.Root>
    </Card.Content>
    {#if admin }
        <Card.Footer>
            <div class="flex gap-4 flex-row flex-wrap w-full justify-center md:justify-between">
                <AdminIn {user}/>
                <AdminOut {user}/>
                <Promo {user}/>
            </div>

        </Card.Footer>
    {/if}
</Card.Root>
