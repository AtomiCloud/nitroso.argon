<script lang="ts">
    import type {UserPrincipalRes, WalletPrincipalRes} from "$lib/api/core/data-contracts";
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Table from "$lib/components/ui/table";
    import AdminIn from "$lib/components/entities/Wallets/AdminIn.svelte";
    import AdminOut from "$lib/components/entities/Wallets/AdminOut.svelte";
    import Promo from "$lib/components/entities/Wallets/Promo.svelte";

    export let user: UserPrincipalRes;
    export let wallet: WalletPrincipalRes;

    export let admin: boolean = false;

</script>


<Card.Root>
    <Card.Header>
        <Card.Title>{user.username}</Card.Title>
        <Card.Description class="break-all">{user.id}</Card.Description>
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
            <div class="flex gap-4 flex-row flex-wrap w-full justify-center">
                <AdminIn {user}/>
                <AdminOut {user}/>
                <Promo {user}/>
            </div>

        </Card.Footer>
    {/if}
</Card.Root>
