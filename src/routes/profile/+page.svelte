<script lang="ts">

    import {page} from "$app/stores";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";
    import Page from "$lib/components/complex/page.svelte";
    import {Input} from "$lib/components/ui/input";
    import {Badge} from "$lib/components/ui/badge";
    import {config} from "../../config/shared";
    import type {Session} from "@auth/core/types";
    //@ts-ignore
    import * as Avatar from "$lib/components/ui/avatar";
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";

    const landscape = config.app.landscape;

    const empty = $page.data.session?.user == null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session: Session | any = $page.data.session;


</script>

<Page notFoundMessage={$_('profile.userNotFound', { locale: $lang })} {empty}>
    <div class="border-b border-b-muted">
        <h2 class="py-10 text-3xl lg:text-4xl text-foreground max-w-[1200px] w-11/12 mx-auto">
            {$_('profile.pageTitle', { locale: $lang })}
        </h2>
    </div>
    <div class="w-full bg-muted dark:bg-background">
        <div class="max-w-[1200px] w-11/12 mx-auto grid gap-y-8 py-8 ">
            <Card.Root class="shadow-xl dark:border-muted-foreground dark:bg-background">
                <Card.Header>
                    <Card.Title>{$_('profile.usernameTitle', { locale: $lang })}</Card.Title>
                </Card.Header>
                <Card.Content>
                    <Card.Description>{$_('profile.usernameDesc', { locale: $lang })}
                    </Card.Description>
                    <Card.Description>{$_('profile.usernameImmutable', { locale: $lang })}</Card.Description>
                    <Input disabled class="my-4" value="{$page.data.user.principal.username}"/>
                </Card.Content>
                <Card.Footer class="bg-muted rounded-b-lg p-4">
                    <Card.Description>{$_('profile.usernameFormat', { locale: $lang })}</Card.Description>
                </Card.Footer>
            </Card.Root>
            <Card.Root class="shadow-xl dark:border-muted-foreground dark:bg-background">
                <Card.Header>
                    <Card.Title>{$_('fields.name', { locale: $lang })}</Card.Title>
                </Card.Header>
                <Card.Content>
                    <Card.Description>{$_('profile.nameDesc', { locale: $lang })}</Card.Description>
                    <Input disabled class="my-4" value="{$page.data.session?.user?.name}"/>
                </Card.Content>
                <Card.Footer class="bg-muted rounded-b-lg p-4">
                    <Card.Description>{$_('profile.nameImmutable', { locale: $lang })}
                    </Card.Description>
                </Card.Footer>
            </Card.Root>
            <Card.Root class="shadow-xl dark:border-muted-foreground dark:bg-background">
                <Card.Header>
                    <Card.Title>{$_('profile.userIdTitle', { locale: $lang })}</Card.Title>
                </Card.Header>
                <Card.Content>
                    <Card.Description>{$_('profile.userIdDesc', { locale: $lang })}</Card.Description>
                    <Input disabled class="my-4" value="{$page.data.user.principal.id}"/>
                </Card.Content>
                <Card.Footer class="bg-muted rounded-b-lg p-4">
                    <Card.Description>{$_('profile.userIdHelp', { locale: $lang })}
                    </Card.Description>
                </Card.Footer>
            </Card.Root>

            <Card.Root class="shadow-xl dark:border-muted-foreground dark:bg-background">
                <div class="flex justify-between">
                    <div>
                        <Card.Header>
                            <Card.Title>{$_('profile.avatarTitle', { locale: $lang })}</Card.Title>
                        </Card.Header>
                        <Card.Content>
                            <Card.Description>{$_('profile.avatarDesc', { locale: $lang })}</Card.Description>
                        </Card.Content>
                    </div>
                    <Avatar.Root class="h-20 w-20 m-8">
                        <Avatar.Image src="{session?.user?.image}"
                                      alt="@session?.user?.name}"/>
                        <Avatar.Fallback>{session?.user?.name?.slice(0, 2)?.toUpperCase()}</Avatar.Fallback>
                    </Avatar.Root>

                </div>
                <Card.Footer class="bg-muted rounded-b-lg p-4">
                    <Card.Description>{$_('profile.avatarSource', { locale: $lang })}</Card.Description>
                </Card.Footer>
            </Card.Root>
            <Card.Root class="shadow-xl dark:border-muted-foreground dark:bg-background">
                <Card.Header>
                    <Card.Title>{$_('fields.email', { locale: $lang })}</Card.Title>
                </Card.Header>
                <Card.Content>
                    <Card.Description>{$_('profile.emailDesc', { locale: $lang })}</Card.Description>
                    <Input disabled class="my-4" value="{session?.user?.email}"/>
                </Card.Content>
                <Card.Footer class="bg-muted rounded-b-lg p-4">
                    <Card.Description>{$_('profile.emailSource', { locale: $lang })}</Card.Description>
                </Card.Footer>
            </Card.Root>

            {#if session?.roles?.length > 0}
                <Card.Root class="shadow-xl dark:border-muted-foreground dark:bg-background">
                    <Card.Header>
                        <Card.Title>{$_('profile.rolesTitle', { locale: $lang })}</Card.Title>
                    </Card.Header>
                    <Card.Content>
                        <Card.Description>{$_('profile.rolesDesc', { locale: $lang })}</Card.Description>
                        <div class="flex gap-4 py-2">
                            {#each session?.roles as role}
                                <Badge>{role}</Badge>
                            {/each}
                        </div>
                    </Card.Content>
                    <Card.Footer class="bg-muted rounded-b-lg p-4">
                        <Card.Description>{$_('profile.managedByAdmins', { locale: $lang })}</Card.Description>
                    </Card.Footer>
                </Card.Root>
            {/if}

            {#if session?.permissions?.length > 0}
                <Card.Root class="shadow-xl dark:border-muted-foreground dark:bg-background">
                    <Card.Header>
                        <Card.Title>{$_('profile.permissionsTitle', { locale: $lang })}</Card.Title>
                    </Card.Header>
                    <Card.Content>
                        <Card.Description>{$_('profile.permissionsDesc', { locale: $lang })}</Card.Description>
                        <div class="flex gap-4 py-2">
                            {#each session?.permissions as p}
                                <Badge>{p}</Badge>
                            {/each}
                        </div>
                    </Card.Content>
                    <Card.Footer class="bg-muted rounded-b-lg p-4">
                        <Card.Description>{$_('profile.managedByAdmins', { locale: $lang })}</Card.Description>
                    </Card.Footer>
                </Card.Root>
            {/if}
            {#if landscape === "lapras" }
                <Card.Root class="shadow-xl dark:border-muted-foreground dark:bg-background">
                    <Card.Header>
                        <Card.Title>{$_('profile.jwtAccessTitle', { locale: $lang })}</Card.Title>
                    </Card.Header>
                    <Card.Content>
                        <Card.Description>{$_('profile.jwtAccessDesc', { locale: $lang })}
                        </Card.Description>
                        <p class="max-w-[480px] break-all">{session?.access_token}</p>
                    </Card.Content>
                    <Card.Footer class="bg-muted rounded-b-lg p-4">
                    </Card.Footer>
                </Card.Root>
                <Card.Root class="shadow-xl dark:border-muted-foreground dark:bg-background">
                    <Card.Header>
                        <Card.Title>{$_('profile.jwtIdTitle', { locale: $lang })}</Card.Title>
                    </Card.Header>
                    <Card.Content>
                        <Card.Description>{$_('profile.jwtIdDesc', { locale: $lang })}
                        </Card.Description>
                        <p class="max-w-[480px] break-all">{session?.id_token}</p>
                    </Card.Content>
                    <Card.Footer class="bg-muted rounded-b-lg p-4">
                    </Card.Footer>
                </Card.Root>
            {/if}

        </div>
    </div>


</Page>
