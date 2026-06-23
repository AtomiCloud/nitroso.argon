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
    import {_} from "svelte-i18n";
    import {lang, formatMoney} from "$lib/i18n";

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
                {$_('wallets.deposit.title', { locale: $lang })}
            </Button>
        </div>
    </Card.Header>
    <Card.Content>
        <Table.Root>
            <Table.Header>
                <Table.Row>
                    <Table.Head>{$_('wallets.card.account', { locale: $lang })}</Table.Head>
                    <Table.Head>{$_('fields.amount', { locale: $lang })}</Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                <Table.Row>
                    <Table.Cell>{$_('wallets.card.usable', { locale: $lang })}</Table.Cell>
                    <Table.Cell>{formatMoney(wallet.usable, $lang)}</Table.Cell>
                </Table.Row>
                <Table.Row>
                    <Table.Cell>{$_('wallets.card.bookingReserve', { locale: $lang })}</Table.Cell>
                    <Table.Cell>{formatMoney(wallet.bookingReserve, $lang)}</Table.Cell>
                </Table.Row>
                <Table.Row>
                    <Table.Cell>{$_('wallets.card.withdrawReserve', { locale: $lang })}</Table.Cell>
                    <Table.Cell>{formatMoney(wallet.withdrawReserve, $lang)}</Table.Cell>
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
