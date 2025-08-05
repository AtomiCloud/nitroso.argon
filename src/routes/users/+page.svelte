<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    import type {UserPrincipalRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../errors/problem_details";
    import {Res} from "$lib/core/result";
    import {problem} from "../../store";
    import Loader from "$lib/components/complex/loader.svelte";
    import {Input} from "$lib/components/ui/input";
    import {page} from "$app/stores";
    import {goto} from "$app/navigation";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    import {Button} from "$lib/components/ui/button";

    import type {PageData} from "./$types";

    export let data: PageData;

    $: users = (Res.fromSerial<UserPrincipalRes[], ProblemDetails>(data.result)
        .match({
            ok: (a: UserPrincipalRes[]): UserPrincipalRes[] => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e);
                return null as never;
            }
        }) satisfies Promise<UserPrincipalRes[]>)
    let usernameSearch = $page.url.searchParams.get('username') || "";
    let userIdSearch = $page.url.searchParams.get('userId') || "";

    function triggerSearch() {
        const params = new URLSearchParams();
        if (usernameSearch) params.set('username', usernameSearch);
        if (userIdSearch) params.set('userId', userIdSearch);
        
        goto(`?${params.toString()}`, {
            keepFocus: true,
            noScroll: true,
        });
    }

</script>

<div class="flex flex-col">
    <div class="flex flex-col w-11/12 max-w-[1200px] mx-auto my-12">
        <div class="flex flex-col sm:flex-row gap-4 mb-4">
            <div class="flex-1">
                <label for="username-search" class="block text-sm font-medium mb-2">Search by Username</label>
                <Input id="username-search" placeholder="Enter username..." bind:value={usernameSearch} on:input={triggerSearch}/>
            </div>
            <div class="flex-1">
                <label for="userid-search" class="block text-sm font-medium mb-2">Search by User ID</label>
                <Input id="userid-search" placeholder="Enter user ID..." bind:value={userIdSearch} on:input={triggerSearch}/>
            </div>
        </div>
        {#await users}
            <Loader/>
        {:then u}
            <Page notFoundMessage="No users found" empty={u.length === 0}>

                <div class="grid gap-6 my-6">
                    {#each u as user}
                        <Card.Root class="hover:shadow-md transition-shadow duration-200">
                            <Card.Header class="pb-4">
                                <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                    <div class="flex-1 space-y-3">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                <span class="text-primary font-semibold text-sm">
                                                    {user.username?.charAt(0)?.toUpperCase() || 'U'}
                                                </span>
                                            </div>
                                            <div>
                                                <Card.Title class="text-lg">{user.username}</Card.Title>
                                                <Card.Description class="text-xs font-mono">{user.id}</Card.Description>
                                            </div>
                                        </div>
                                        
                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                            <div class="flex items-center gap-2">
                                                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                <div class="text-sm">
                                                    <span class="text-muted-foreground">Email:</span>
                                                    <span class="ml-1 font-medium">{user.email || 'N/A'}</span>
                                                </div>
                                            </div>
                                            
                                            <div class="flex items-center gap-2">
                                                <div class="w-2 h-2 {user.emailVerified ? 'bg-green-500' : 'bg-red-500'} rounded-full"></div>
                                                <div class="text-sm">
                                                    <span class="text-muted-foreground">Status:</span>
                                                    <span class="ml-1 font-medium {user.emailVerified ? 'text-green-600' : 'text-red-600'}">
                                                        {user.emailVerified ? 'Verified' : 'Unverified'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div class="flex items-center gap-2">
                                                <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                <div class="text-sm">
                                                    <span class="text-muted-foreground">Roles:</span>
                                                    <span class="ml-1 font-medium">
                                                        {#if user.roles && user.roles.length > 0}
                                                            {#each user.roles as role, i}
                                                                <span class="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs mr-1">
                                                                    {role}
                                                                </span>
                                                            {/each}
                                                        {:else}
                                                            <span class="text-muted-foreground">None</span>
                                                        {/if}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="lg:ml-4">
                                        <Button 
                                            class="w-full lg:w-auto min-w-[120px]" 
                                            href="/users/{user.id}"
                                            variant="outline"
                                        >
                                            View Details
                                        </Button>
                                    </div>
                                </div>
                            </Card.Header>
                        </Card.Root>
                    {/each}
                </div>
            </Page>
        {/await}
    </div>
</div>
