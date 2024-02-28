<script>
    import {Button} from "$lib/components/ui/button";
    import {signIn, signOut} from "@auth/sveltekit/client";
    import {page} from "$app/stores";

    //@ts-ignore
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

    //@ts-ignore
    import * as Avatar from "$lib/components/ui/avatar";
    import {LucideLoader, User} from "lucide-svelte";


    let loading = false;

    function login() {
        loading = true;
        signIn('descope');
    }
</script>

{#if $page.data.session}
    <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild let:builder>
            <Button
                    variant="ghost"
                    builders={[builder]}
                    class="relative h-8 w-8 rounded-full"
            >
                <Avatar.Root class="h-8 w-8">
                    <Avatar.Image src="{$page.data.session?.user?.image}"
                                  alt="@{$page.data.session?.user?.email}"/>
                    <Avatar.Fallback>{$page.data.session?.user?.email?.slice(0, 2)?.toUpperCase()}</Avatar.Fallback>
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
                        {$page.data.session?.user?.email}
                    </p>
                </div>
            </DropdownMenu.Label>
            {#if $page.data.session?.roles?.includes("admin")}
            <DropdownMenu.Separator/>
            <a href="/costs">
                <DropdownMenu.Item>
                    Costs
                </DropdownMenu.Item>
            </a>
            <a href="/discounts">
                <DropdownMenu.Item>
                    Discounts
                </DropdownMenu.Item>
            </a>
            <a href="/wallets">
                <DropdownMenu.Item>
                    Wallets
                </DropdownMenu.Item>
            </a>
            <a href="/users">
                <DropdownMenu.Item>
                    Users
                </DropdownMenu.Item>
            </a>
            {/if}
            <DropdownMenu.Separator/>
            <a href="/wallets/{$page.data.user.wallet.id}">
                <DropdownMenu.Item>
                    BALANCE: SGD {$page.data.user?.wallet?.usable?.toFixed(2) ?? "0.00" }
                </DropdownMenu.Item>
            </a>
            <DropdownMenu.Separator/>
            <a href="/schedules">
                <DropdownMenu.Item class="font-semibold">
                    Purchase Booking Now!
                </DropdownMenu.Item>
            </a>
            <a href="{$page.data.session?.roles?.includes('admin') ? '/bookings' : `/bookings?userId=${$page.data.user.principal.id}`}">
                <DropdownMenu.Item>
                    Bookings
                </DropdownMenu.Item>
            </a>
            <a href="{$page.data.session?.roles?.includes('admin') ? '/passengers' : `/passengers?userId=${$page.data.user.principal.id}`}">
                <DropdownMenu.Item>
                    Passengers
                </DropdownMenu.Item>
            </a>
            <a href="{$page.data.session?.roles?.includes('admin') ? '/withdrawals' : `/withdrawals?userId=${$page.data.user.principal.id}`}">
                <DropdownMenu.Item>
                    Withdrawals
                </DropdownMenu.Item>
            </a>
            <a href="{$page.data.session?.roles?.includes('admin') ? '/transactions' : `/transactions?userId=${$page.data.user.principal.id}`}">
                <DropdownMenu.Item>
                    Transactions
                </DropdownMenu.Item>
            </a>

            <a href="/profile">
                <DropdownMenu.Item>
                    Profile
                </DropdownMenu.Item>
            </a>
            <DropdownMenu.Item on:click={() => signOut()}>
                Log out
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
        Sign in
    </Button>
{/if}
