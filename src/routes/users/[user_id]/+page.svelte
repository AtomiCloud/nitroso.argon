<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";

    import {Res} from "$lib/core/result";
    import type {UserRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../../errors/problem_details";
    import {problem} from "../../../store";

    import Loader from "$lib/components/complex/loader.svelte";
    import Wallet from "$lib/components/entities/Wallets/Wallet.svelte";
    import UserPayments from "$lib/components/entities/Payments/UserPayments.svelte";
    import type {PageData} from "./$types";
    import {page} from "$app/stores";
    import {Button} from "$lib/components/ui/button";
    import {Badge} from "$lib/components/ui/badge";
    import {Input} from "$lib/components/ui/input";
    import {api} from "../../../store";
    import {toResult} from "$lib/utility";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {AlertTriangle, CreditCard, LucideLoader, LucidePlus, Ticket, Users, Wallet as WalletIcon, X} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    //@ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import {Checkbox} from "$lib/components/ui/checkbox";
    import {Label} from "$lib/components/ui/label";
    import {isWipedUser, wipeConflictReason} from "./wipe";

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

    // ---- account wipe (admin): POST User/{id}/wipe. Irreversibly removes a
    // user's personal data (PDPA); wallets / transactions / withdrawals are
    // kept for accounting. The detail endpoint does not yet expose wipedAt, so
    // the wiped state is inferred from a 'deleted-' username. ----
    let wipeOpen = false;
    let wipeConfirm = "";
    let wipeAcknowledged = false;
    let wipeSubmitting = false;

    function openWipe() {
        wipeConfirm = "";
        wipeAcknowledged = false;
        wipeOpen = true;
    }

    async function wipeAccount(userId: string) {
        wipeSubmitting = true;
        await toResult(() => $api.vUserWipeCreate(userId, "1"),
            $_("admin.users.wipe.error", {locale: $lang})).match({
            ok: () => {
                toast.success($_("admin.users.wipe.success", {locale: $lang}));
                wipeOpen = false;
                invalidateAll();
            },
            err: (e) => {
                const reason = wipeConflictReason(e);
                if (reason === "wallet_not_empty") {
                    toast.error($_("admin.users.wipe.conflict.walletNotEmpty", {locale: $lang}));
                } else if (reason === "withdrawal_in_flight") {
                    toast.error($_("admin.users.wipe.conflict.withdrawalInFlight", {locale: $lang}));
                } else if (reason === "already_wiped") {
                    // already wiped — reload the detail so the wiped banner shows
                    wipeOpen = false;
                    invalidateAll();
                } else {
                    toast.error(e.detail ?? e.type);
                }
            }
        });
        wipeSubmitting = false;
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
                    {#if isWipedUser(u.principal)}
                        <Card.Root class="border-destructive/40 bg-destructive/5">
                            <Card.Content class="pt-6">
                                <Alert.Root variant="destructive">
                                    <AlertTriangle class="h-4 w-4"/>
                                    <Alert.Title>{$_("admin.users.wiped.title", {locale: $lang})}</Alert.Title>
                                    <Alert.Description>{$_("admin.users.wiped.body", {locale: $lang})}</Alert.Description>
                                </Alert.Root>
                            </Card.Content>
                        </Card.Root>
                    {/if}

                    {#if session?.roles?.includes("admin") && !isWipedUser(u.principal)}
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

                        <!-- Danger zone: irreversibly wipe personal data (PDPA). -->
                        <Card.Root class="border-destructive/40">
                            <Card.Header>
                                <Card.Title class="flex items-center gap-2 text-destructive">
                                    <AlertTriangle class="h-5 w-5"/>
                                    {$_("admin.users.wipe.dangerZoneTitle", {locale: $lang})}
                                </Card.Title>
                                <Card.Description>{$_("admin.users.wipe.dangerZoneDescription", {locale: $lang})}</Card.Description>
                            </Card.Header>
                            <Card.Content>
                                <div class="flex flex-col gap-6">
                                    <div class="grid gap-6 md:grid-cols-2">
                                        <div class="flex flex-col gap-2">
                                            <h4 class="font-medium text-destructive">{$_("admin.users.wipe.deletesHeading", {locale: $lang})}</h4>
                                            <ul class="flex flex-col gap-1 text-sm text-muted-foreground">
                                                <li>{$_("admin.users.wipe.deletesPassengers", {locale: $lang})}</li>
                                                <li>{$_("admin.users.wipe.deletesTickets", {locale: $lang})}</li>
                                                <li>{$_("admin.users.wipe.deletesIdentity", {locale: $lang})}</li>
                                            </ul>
                                        </div>
                                        <div class="flex flex-col gap-2">
                                            <h4 class="font-medium">{$_("admin.users.wipe.keptHeading", {locale: $lang})}</h4>
                                            <p class="text-sm text-muted-foreground">{$_("admin.users.wipe.keptBody", {locale: $lang})}</p>
                                        </div>
                                    </div>
                                    <Alert.Root>
                                        <AlertTriangle class="h-4 w-4"/>
                                        <Alert.Description>{$_("admin.users.wipe.descopeReminder", {locale: $lang})}</Alert.Description>
                                    </Alert.Root>
                                    <Button variant="destructive" class="self-start" on:click={openWipe}>
                                        <AlertTriangle class="mr-2 h-4 w-4"/>
                                        {$_("admin.users.wipe.trigger", {locale: $lang})}
                                    </Button>
                                </div>
                            </Card.Content>
                        </Card.Root>

                        <Dialog.Root bind:open={wipeOpen}>
                            <Dialog.Content class="max-w-md">
                                <Dialog.Header>
                                    <Dialog.Title>{$_("admin.users.wipe.dialogTitle", {locale: $lang})}</Dialog.Title>
                                    <Dialog.Description>
                                        {$_("admin.users.wipe.dialogBody", {locale: $lang, values: {username: u.principal.username ?? ""}})}
                                    </Dialog.Description>
                                </Dialog.Header>
                                <div class="flex flex-col gap-4">
                                    <div class="flex flex-col gap-2">
                                        <div class="text-sm text-muted-foreground">
                                            {$_("admin.users.wipe.dialogTypeLead", {locale: $lang})}
                                            <code class="mx-1 rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-foreground">{u.principal.username ?? ""}</code>
                                            {$_("admin.users.wipe.dialogTypeTrail", {locale: $lang})}
                                        </div>
                                        <Input autocapitalize="none" autocorrect="off" spellcheck={false}
                                               bind:value={wipeConfirm}/>
                                        <p class="text-sm text-destructive {wipeConfirm === "" || wipeConfirm === (u.principal.username ?? "") ? "hidden" : ""}">
                                            {$_("admin.users.wipe.dialogTypeMismatch", {locale: $lang})}
                                        </p>
                                    </div>
                                    <div class="flex items-start gap-2">
                                        <Checkbox id="wipe-ack" bind:checked={wipeAcknowledged} class="mt-0.5"/>
                                        <Label for="wipe-ack" class="font-normal cursor-pointer leading-tight">
                                            {$_("admin.users.wipe.dialogCannotUndo", {locale: $lang})}
                                        </Label>
                                    </div>
                                    <Button variant="destructive"
                                            on:click={() => wipeAccount(u.principal.id ?? "")}
                                            disabled={wipeSubmitting || wipeConfirm !== (u.principal.username ?? "") || wipeConfirm === "" || !wipeAcknowledged}>
                                        {#if wipeSubmitting}
                                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                                        {/if}
                                        {$_("admin.users.wipe.dialogConfirm", {locale: $lang})}
                                    </Button>
                                </div>
                            </Dialog.Content>
                        </Dialog.Root>
                    {/if}

                    <Wallet
                            user={u.principal}
                            wallet={u.wallet}
                            admin={session?.roles?.includes("admin")}
                    />

                    {#if session?.roles?.includes("admin")}
                        <UserPayments walletId={u.wallet.id}/>
                    {/if}
                </div>
            {/await}
        </div>
    </div>

</Page>
