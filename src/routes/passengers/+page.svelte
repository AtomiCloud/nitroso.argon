<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    import type {PassengerPrincipalRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../errors/problem_details";
    import {Res} from "$lib/core/result";
    import {problem} from "../../store";
    import Loader from "$lib/components/complex/loader.svelte";
    import {Input} from "$lib/components/ui/input";
    import {page} from "$app/stores";
    import {goto} from "$app/navigation";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";


    import {CalendarDate, type DateValue} from "@internationalized/date";
    import type {PageData} from "./$types";
    import {Badge} from "$lib/components/ui/badge";
    import CreatePassengers from "$lib/components/entities/Passengers/CreatePassengers.svelte";
    import UpdatePassengers from "$lib/components/entities/Passengers/UpdatePassengers.svelte";
    import DeletePassengers from "$lib/components/entities/Passengers/DeletePassengers.svelte";

    export let data: PageData;

    // Util

    $: passengers = (Res.fromSerial<PassengerPrincipalRes[], ProblemDetails>(data.result)
        .match({
            ok: (a: PassengerPrincipalRes[]): PassengerPrincipalRes[] => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e);
                return null as never;
            }
        }) satisfies Promise<PassengerPrincipalRes[]>)

    let search = $page.url.searchParams.get('search') || "";
    let userId = $page.url.searchParams.get('userId') || "";

    function triggerSearch() {
        goto(`?userId=${userId}&search=${search}`,
            {
                keepFocus: true,
                noScroll: true,
            }
        );
    }

</script>

<div class="flex flex-col">
    <div class="border-b bg-muted ">
        <div class="flex justify-center text-3xl lg:text-4xl sm:justify-between gap-4 flex-wrap py-8 items-center text-foreground max-w-[1200px] w-11/12 mx-auto">
            Passengers
        </div>

    </div>
    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">
        <div class="flex gap-4">

            <Input placeholder="Search passenger" bind:value={search} on:input={triggerSearch}/>
            <CreatePassengers userId={userId === "" ? $page.data.user.principal.id : userId}/>
        </div>
        {#if $page.data.session?.roles?.includes("admin")}
            <Input class="flex-1" placeholder="Filter by user ID..." bind:value={userId} on:input={triggerSearch}/>
        {/if}


        {#await passengers}
            <Loader/>
        {:then ps}
            <Page notFoundMessage="Not passengers found" empty={ps.length === 0}>
                {#each ps as p}
                    <Card.Root>
                        <Card.Header>
                            <div class="flex justify-between">
                                <div class="flex items-center gap-4">
                                    <div>
                                        <Card.Title>{p.fullName}</Card.Title>
                                        <Card.Description>{p.passportNumber}</Card.Description>
                                    </div>
                                    <Badge>{p.gender}</Badge>
                                </div>
                                <div class="flex items-center gap-4">
                                    <UpdatePassengers passenger={p} userId={userId} />
                                    <DeletePassengers passenger={p} userId={userId}/>
                                </div>
                            </div>
                        </Card.Header>
                    </Card.Root>
                {/each}
            </Page>
        {/await}
    </div>
</div>
