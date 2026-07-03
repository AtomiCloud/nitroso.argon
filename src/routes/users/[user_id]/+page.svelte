<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";

    import {Res} from "$lib/core/result";
    import type {UserRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../../errors/problem_details";
    import {problem} from "../../../store";

    import Loader from "$lib/components/complex/loader.svelte";
    import Wallet from "$lib/components/entities/Wallets/Wallet.svelte";
    import type {PageData} from "./$types";
    import {page} from "$app/stores";
    import {Button} from "$lib/components/ui/button";
    import {CreditCard, Ticket, Users, Wallet as WalletIcon} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";

    export let data: PageData;

    const session: any = $page.data.session;

    $: user = (Res.fromSerial<UserRes, ProblemDetails>(data.result)
        .match({
            ok: (a: UserRes): UserRes => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                problem.set(e);
                return null as never;
            }
        }) satisfies Promise<UserRes>)


</script>

<Page notFoundMessage={$_("admin.users.userNotFound", {locale: $lang})}>
    <div class="border-b border-b-muted">
        <h2 class="py-10 text-3xl lg:text-4xl text-foreground max-w-[1200px] w-11/12 mx-auto">
            {$_("admin.users.userHeading", {locale: $lang})}
        </h2>
    </div>
    <div class="w-full min-h-[80vh] bg-muted dark:bg-background">
        <div class="flex flex-col w-11/12 max-w-[1200px] mx-auto py-8">
            {#await user}
                <Loader/>
            {:then u}
                <div class="flex flex-col gap-4">
                    <!-- Quick Navigation Card -->
                    {#if session?.roles?.includes("admin")}
                        <Card.Root>
                            <Card.Header>
                                <Card.Title>{$_("admin.users.userData", {locale: $lang})}</Card.Title>
                                <Card.Description>{$_("admin.users.userDataDescription", {locale: $lang, values: {username: u.principal.username}})}</Card.Description>
                            </Card.Header>
                            <Card.Content>
                                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <Button href="/transactions?userId={u.principal.id}" variant="outline" class="h-auto p-4 flex flex-col gap-2">
                                        <CreditCard class="h-6 w-6" />
                                        <span class="text-sm">{$_("admin.users.transactions", {locale: $lang})}</span>
                                    </Button>
                                    <Button href="/bookings?userId={u.principal.id}" variant="outline" class="h-auto p-4 flex flex-col gap-2">
                                        <Ticket class="h-6 w-6" />
                                        <span class="text-sm">{$_("admin.users.bookings", {locale: $lang})}</span>
                                    </Button>
                                    <Button href="/passengers?userId={u.principal.id}" variant="outline" class="h-auto p-4 flex flex-col gap-2">
                                        <Users class="h-6 w-6" />
                                        <span class="text-sm">{$_("admin.users.passengers", {locale: $lang})}</span>
                                    </Button>
                                    <Button href="/withdrawals?userId={u.principal.id}" variant="outline" class="h-auto p-4 flex flex-col gap-2">
                                        <WalletIcon class="h-6 w-6" />
                                        <span class="text-sm">{$_("admin.users.withdrawals", {locale: $lang})}</span>
                                    </Button>
                                </div>
                            </Card.Content>
                        </Card.Root>
                    {/if}
                    
                    <Wallet
                            user={u.principal}
                            wallet={u.wallet}
                            admin={session?.roles?.includes("admin")}
                    />
                </div>
            {/await}
        </div>
    </div>

</Page>
