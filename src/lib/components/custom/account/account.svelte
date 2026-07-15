<script lang="ts">
    import {Button} from "$lib/components/ui/button";
    import {signIn, signOut} from "@auth/sveltekit/client";
    import {page} from "$app/stores";

    //@ts-ignore
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

    //@ts-ignore
    import * as Avatar from "$lib/components/ui/avatar";
    import {LucideLoader, User} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang, formatMoney} from "$lib/i18n";


    let loading = false;

    function login() {
        loading = true;
        signIn('descope');
    }

    async function logout() {
        await fetch("https://api.descope.com/oauth2/v1/logout", {
            method: "POST",
            body: new URLSearchParams({id_token_hint: session.id_token}),
        });
        await signOut({ callbackUrl: '/' });
    }

    const session: any = $page.data.session;
</script>

{#if session}
    <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild let:builder>
            <Button
                    variant="ghost"
                    builders={[builder]}
                    class="relative h-8 w-8 rounded-full">
                <Avatar.Root class="h-8 w-8">
                    <Avatar.Image src="{session?.user?.image}"
                                  alt="@{session?.user?.email}"/>
                    <Avatar.Fallback>{session?.user?.email?.slice(0, 2)?.toUpperCase()}</Avatar.Fallback>
                </Avatar.Root>
            </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content class="w-56">
            <DropdownMenu.Label class="font-normal">
                <div class="flex flex-col space-y-1">
                    <p class="text-sm font-medium leading-none">
                        @{$page.data.user?.principal?.username}
                    </p>
                    <p class="text-xs leading-none text-muted-foreground">
                        {session?.user?.email}
                    </p>
                </div>
            </DropdownMenu.Label>
            {#if session?.roles?.includes("admin")}
            <DropdownMenu.Separator/>
            <a href="/costs">
                <DropdownMenu.Item>
                    {$_('account.costs', { locale: $lang })}
                </DropdownMenu.Item>
            </a>
            <a href="/discounts">
                <DropdownMenu.Item>
                    {$_('account.discounts', { locale: $lang })}
                </DropdownMenu.Item>
            </a>
            <a href="/fees">
                <DropdownMenu.Item>
                    {$_('account.fees', { locale: $lang })}
                </DropdownMenu.Item>
            </a>
            <a href="/stats">
                <DropdownMenu.Item>
                    {$_('account.stats', { locale: $lang })}
                </DropdownMenu.Item>
            </a>
            <a href="/analysis">
                <DropdownMenu.Item>
                    {$_('account.analysis', { locale: $lang })}
                </DropdownMenu.Item>
            </a>
            <a href="/wallets">
                <DropdownMenu.Item>
                    {$_('account.wallets', { locale: $lang })}
                </DropdownMenu.Item>
            </a>
            <a href="/users">
                <DropdownMenu.Item>
                    {$_('account.users', { locale: $lang })}
                </DropdownMenu.Item>
            </a>
            <a href="/partners">
                <DropdownMenu.Item>
                    {$_('account.partners', { locale: $lang })}
                </DropdownMenu.Item>
            </a>
            {/if}
            <DropdownMenu.Separator/>
            <a href="/wallets/{$page.data.user.wallet.id}">
                <DropdownMenu.Item>
                    {$_('account.balance', { locale: $lang, values: { amount: formatMoney($page.data.user?.wallet?.usable ?? 0, $lang) } })}
                </DropdownMenu.Item>
            </a>
            <DropdownMenu.Separator/>
            <a href="{session?.roles?.includes('admin') ? '/bookings' : `/bookings?userId=${$page.data.user.principal.id}`}">
                <DropdownMenu.Item>
                    {$_('account.manageBookings', { locale: $lang })}
                </DropdownMenu.Item>
            </a>
            <a href="{session?.roles?.includes('admin') ? '/passengers' : `/passengers?userId=${$page.data.user.principal.id}`}">
                <DropdownMenu.Item>
                    {$_('account.passengers', { locale: $lang })}
                </DropdownMenu.Item>
            </a>
            <a href="{session?.roles?.includes('admin') ? '/withdrawals' : `/withdrawals?userId=${$page.data.user.principal.id}`}">
                <DropdownMenu.Item>
                    {$_('account.withdrawals', { locale: $lang })}
                </DropdownMenu.Item>
            </a>
            <a href="{session?.roles?.includes('admin') ? '/transactions' : `/transactions?userId=${$page.data.user.principal.id}`}">
                <DropdownMenu.Item>
                    {$_('account.transactions', { locale: $lang })}
                </DropdownMenu.Item>
            </a>

            <a href="/profile">
                <DropdownMenu.Item>
                    {$_('account.profile', { locale: $lang })}
                </DropdownMenu.Item>
            </a>
            <DropdownMenu.Item on:click={logout}>
                {$_('account.logout', { locale: $lang })}
            </DropdownMenu.Item>
        </DropdownMenu.Content>
    </DropdownMenu.Root>
{:else}
    <Button on:click={login} disabled={loading}>
        {#if loading}
            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
        {:else}
            <User class="mr-2 h-4 w-4"/>
        {/if}
        {$_('account.signIn', { locale: $lang })}
    </Button>
{/if}
