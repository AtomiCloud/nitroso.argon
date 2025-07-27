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

                <div class="flex flex-col gap-4 my-4">
                    {#each u as user}
                        <div>
                            <Card.Root>
                                <Card.Header>
                                    <div class="flex flex-wrap gap-4 items-center justify-between">
                                        <div>
                                            <Card.Title>{user.username}</Card.Title>
                                            <Card.Description>{user.id}</Card.Description>
                                        </div>
                                        <Button class="max-w-80 w-full lg:max-w-40" href="/users/{user.id}">
                                            View Details
                                        </Button>
                                    </div>
                                </Card.Header>
                            </Card.Root>
                        </div>
                    {/each}
                </div>
            </Page>
        {/await}
    </div>
</div>
