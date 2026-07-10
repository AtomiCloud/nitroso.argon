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
    import {Badge} from "$lib/components/ui/badge";
    import {Input} from "$lib/components/ui/input";
    import {api} from "../../../store";
    import {toResult} from "$lib/utility";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {CreditCard, LucideLoader, LucidePlus, Ticket, Users, Wallet as WalletIcon, X} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";

    export let data: PageData;

    const session: any = $page.data.session;

    // ---- extra-role management (admin): POST/DELETE User/{id}/roles/{role}.
    // Extra roles only affect pricing/discount targeting, never permissions. ----
    const ROLE_FORMAT = /^[a-z0-9_-]{1,64}$/;

    let addRoleOpen = false;
    let newRole = "";
    let roleSubmitting = false;
    $: newRoleValid = ROLE_FORMAT.test(newRole);

    function openAddRole() {
        newRole = "";
        addRoleOpen = true;
    }

    async function addRole(userId: string) {
        if (!newRoleValid) return;
        roleSubmitting = true;
        await toResult(() => $api.vUserRolesCreate(userId, newRole, "1"),
            $_("admin.users.rolesCard.addError", {locale: $lang})).match({
            ok: () => {
                toast.success($_("admin.users.rolesCard.addSuccess", {locale: $lang, values: {role: newRole}}));
                addRoleOpen = false;
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        });
        roleSubmitting = false;
    }

    let removeRoleOpen = false;
    let removeTarget = "";

    function confirmRemoveRole(role: string) {
        removeTarget = role;
        removeRoleOpen = true;
    }

    async function removeRole(userId: string) {
        roleSubmitting = true;
        await toResult(() => $api.vUserRolesDelete(userId, removeTarget, "1"),
            $_("admin.users.rolesCard.removeError", {locale: $lang})).match({
            ok: () => {
                toast.success($_("admin.users.rolesCard.removeSuccess", {locale: $lang, values: {role: removeTarget}}));
                removeRoleOpen = false;
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        });
        roleSubmitting = false;
    }

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

                    <!-- Roles: token roles (filled) vs admin-granted extra
                         roles (outlined, removable). Extra roles only steer
                         pricing/discount targeting — never permissions. -->
                    {#if session?.roles?.includes("admin")}
                        <Card.Root>
                            <Card.Header>
                                <Card.Title>{$_("admin.users.rolesCard.title", {locale: $lang})}</Card.Title>
                                <Card.Description>{$_("admin.users.rolesCard.description", {locale: $lang})}</Card.Description>
                            </Card.Header>
                            <Card.Content>
                                <div class="flex flex-col gap-4">
                                    <div class="flex flex-wrap items-center gap-2">
                                        {#each u.principal.roles ?? [] as role}
                                            <Badge>{role}</Badge>
                                        {/each}
                                        {#each u.principal.extraRoles ?? [] as role}
                                            <Badge variant="outline" class="gap-1 pr-1">
                                                {role}
                                                <button class="rounded-full p-0.5 hover:bg-destructive/20"
                                                        aria-label={$_("admin.users.rolesCard.removeAria", {locale: $lang, values: {role}})}
                                                        on:click={() => confirmRemoveRole(role)}>
                                                    <X class="h-3 w-3"/>
                                                </button>
                                            </Badge>
                                        {/each}
                                        {#if (u.principal.roles ?? []).length === 0 && (u.principal.extraRoles ?? []).length === 0}
                                            <span class="text-sm text-muted-foreground">{$_("admin.users.noRoles", {locale: $lang})}</span>
                                        {/if}
                                    </div>
                                    <div class="text-sm text-muted-foreground">{$_("admin.users.rolesCard.legend", {locale: $lang})}</div>
                                    <Button variant="outline" class="self-start" on:click={openAddRole}>
                                        <LucidePlus class="mr-2 h-4 w-4"/>
                                        {$_("admin.users.rolesCard.addTrigger", {locale: $lang})}
                                    </Button>
                                </div>
                            </Card.Content>
                        </Card.Root>

                        <Dialog.Root bind:open={addRoleOpen}>
                            <Dialog.Content class="max-w-md">
                                <Dialog.Header>
                                    <Dialog.Title>{$_("admin.users.rolesCard.addTitle", {locale: $lang})}</Dialog.Title>
                                    <Dialog.Description>
                                        {$_("admin.users.rolesCard.addIntro", {locale: $lang})}
                                    </Dialog.Description>
                                </Dialog.Header>
                                <div class="flex flex-col gap-3">
                                    <Input placeholder={$_("admin.users.rolesCard.rolePlaceholder", {locale: $lang})}
                                           autocapitalize="none" autocorrect="off" spellcheck={false}
                                           bind:value={newRole}
                                           on:input={() => newRole = newRole.toLowerCase()}/>
                                    <p class="text-sm text-destructive {newRole === '' || newRoleValid ? 'hidden' : ''}">
                                        {$_("admin.users.rolesCard.roleInvalid", {locale: $lang})}
                                    </p>
                                    <Button on:click={() => addRole(u.principal.id ?? "")}
                                            disabled={roleSubmitting || !newRoleValid}>
                                        {#if roleSubmitting}
                                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                                        {/if}
                                        {$_("admin.users.rolesCard.addConfirm", {locale: $lang})}
                                    </Button>
                                </div>
                            </Dialog.Content>
                        </Dialog.Root>

                        <Dialog.Root bind:open={removeRoleOpen}>
                            <Dialog.Content class="max-w-md">
                                <Dialog.Header>
                                    <Dialog.Title>{$_("admin.users.rolesCard.removeTitle", {locale: $lang})}</Dialog.Title>
                                    <Dialog.Description>
                                        {$_("admin.users.rolesCard.removeBody", {locale: $lang, values: {role: removeTarget}})}
                                    </Dialog.Description>
                                </Dialog.Header>
                                <Button variant="destructive" on:click={() => removeRole(u.principal.id ?? "")}
                                        disabled={roleSubmitting}>
                                    {#if roleSubmitting}
                                        <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                                    {/if}
                                    {$_("admin.users.rolesCard.removeConfirm", {locale: $lang})}
                                </Button>
                            </Dialog.Content>
                        </Dialog.Root>
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
