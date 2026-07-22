<script lang="ts">
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Table from "$lib/components/ui/table";
    import {Badge} from "$lib/components/ui/badge";
    import {Button} from "$lib/components/ui/button";
    import type {PaymentPrincipalRes} from "$lib/api/core/data-contracts";
    import {api} from "../../../../store";
    import {toResult} from "$lib/utility";
    import {toast} from "svelte-sonner";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatDateTime} from "$lib/i18n";
    import {shortenId} from "../Withdrawals/withdrawal";
    import {LucideLoader} from "lucide-svelte";
    import {onMount} from "svelte";

    // Admin evidence card: every gateway payment on this user's wallet
    // (zinc GET /Payment?WalletId=…, OnlyAdmin, newest-updated first).
    export let walletId: string;

    const PAGE = 20;

    let payments: PaymentPrincipalRes[] = [];
    let loading = false;
    let failed = false;
    // a full page implies more may exist; a short page is the end
    let hasMore = false;

    async function load() {
        loading = true;
        await toResult(() => $api.vPaymentDetail("1", {WalletId: walletId, Limit: PAGE, Skip: payments.length}),
            $_('admin.users.paymentsCard.loadError', {locale: $lang})).match({
            ok: (r: PaymentPrincipalRes[]) => {
                failed = false;
                // zinc orders LastUpdated DESC before Skip/Take, but a payment
                // updated between pages shifts rows — drop rows we already
                // hold, or duplicate ids would crash the keyed each-block
                const seen = new Set(payments.map(p => p.id));
                payments = [...payments, ...r.filter(p => !seen.has(p.id))];
                hasMore = r.length === PAGE;
            },
            err: (e) => {
                console.error(e);
                failed = true;
                toast.error($_('admin.users.paymentsCard.loadError', {locale: $lang}));
            }
        });
        loading = false;
    }

    onMount(load);

    async function copyId(id: string) {
        try {
            await navigator.clipboard.writeText(id);
            toast.info($_('admin.users.paymentsCard.copied', {locale: $lang}));
        } catch (e) {
            console.error(e);
        }
    }

    // SUCCEEDED = money captured; CANCELLED = dead intent; anything else is an
    // in-flight Airwallex state (REQUIRES_PAYMENT_METHOD, …) shown as pending
    const STATUS_BADGE: Record<string, string> = {
        SUCCEEDED: 'bg-green-500',
        CANCELLED: 'bg-red-500',
    };
</script>

<Card.Root>
    <Card.Header>
        <Card.Title>{$_('admin.users.paymentsCard.title', {locale: $lang})}</Card.Title>
        <Card.Description>{$_('admin.users.paymentsCard.description', {locale: $lang})}</Card.Description>
    </Card.Header>
    <Card.Content>
        {#if payments.length === 0 && loading}
            <div class="flex justify-center py-6">
                <LucideLoader class="h-5 w-5 animate-spin text-muted-foreground"/>
            </div>
        {:else if payments.length === 0 && failed}
            <div class="py-4 text-sm text-destructive">{$_('admin.users.paymentsCard.loadError', {locale: $lang})}</div>
        {:else if payments.length === 0}
            <div class="py-4 text-sm text-muted-foreground">{$_('admin.users.paymentsCard.empty', {locale: $lang})}</div>
        {:else}
            <div class="overflow-x-auto">
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.Head>{$_('admin.users.paymentsCard.colDate', {locale: $lang})}</Table.Head>
                            <Table.Head>{$_('admin.users.paymentsCard.colPaymentId', {locale: $lang})}</Table.Head>
                            <Table.Head>{$_('admin.users.paymentsCard.colReference', {locale: $lang})}</Table.Head>
                            <Table.Head class="text-right">{$_('admin.users.paymentsCard.colAmount', {locale: $lang})}</Table.Head>
                            <Table.Head class="text-right">{$_('admin.users.paymentsCard.colCaptured', {locale: $lang})}</Table.Head>
                            <Table.Head>{$_('admin.users.paymentsCard.colStatus', {locale: $lang})}</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#each payments as p (p.id)}
                            <Table.Row>
                                <Table.Cell class="whitespace-nowrap">{formatDateTime(p.createdAt, $lang)}</Table.Cell>
                                <Table.Cell>
                                    <button type="button"
                                            class="font-mono text-xs hover:underline underline-offset-4"
                                            title={p.id}
                                            on:click={() => copyId(p.id)}>
                                        {shortenId(p.id)}
                                    </button>
                                </Table.Cell>
                                <Table.Cell>
                                    {#if p.externalReference}
                                        <button type="button"
                                                class="font-mono text-xs hover:underline underline-offset-4"
                                                title={p.externalReference}
                                                on:click={() => copyId(p.externalReference ?? '')}>
                                            {shortenId(p.externalReference)}
                                        </button>
                                    {:else}
                                        <span class="text-muted-foreground">—</span>
                                    {/if}
                                </Table.Cell>
                                <Table.Cell class="whitespace-nowrap text-right">{formatMoney(p.amount, $lang, {currency: p.currency ?? 'SGD'})}</Table.Cell>
                                <Table.Cell class="whitespace-nowrap text-right">{formatMoney(p.capturedAmount, $lang, {currency: p.currency ?? 'SGD'})}</Table.Cell>
                                <Table.Cell>
                                    {#if p.status}
                                        <Badge class={STATUS_BADGE[p.status] ?? 'bg-amber-500'}>{p.status}</Badge>
                                    {:else}
                                        <span class="text-muted-foreground">—</span>
                                    {/if}
                                </Table.Cell>
                            </Table.Row>
                        {/each}
                    </Table.Body>
                </Table.Root>
            </div>
            {#if hasMore}
                <div class="flex justify-center pt-4">
                    <Button variant="outline" size="sm" disabled={loading} on:click={load}>
                        {#if loading}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        {$_('admin.users.paymentsCard.loadMore', {locale: $lang})}
                    </Button>
                </div>
            {/if}
        {/if}
    </Card.Content>
</Card.Root>
