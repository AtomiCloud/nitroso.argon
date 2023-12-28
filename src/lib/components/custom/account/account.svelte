<script>
    import {Button} from "$lib/components/ui/button";
    import {signIn, signOut} from "@auth/sveltekit/client";
    import {page} from "$app/stores";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import * as Avatar from "$lib/components/ui/avatar";
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
                    <Avatar.Image src="{$page.data.session.user?.image}"
                                  alt="@{$page.data.session.user?.email}"/>
                    <Avatar.Fallback>{$page.data.session.user?.email?.slice(0, 2)?.toUpperCase()}</Avatar.Fallback>
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
                        {$page.data.session.user?.email}
                    </p>
                </div>
            </DropdownMenu.Label>
            <DropdownMenu.Separator/>
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
    <Button on:click={() => signIn('descope')}>Sign in</Button>
{/if}
