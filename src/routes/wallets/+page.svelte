<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    import type {WalletPrincipalRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../errors/problem_details";
    import {Res} from "$lib/core/result";
    import {problem} from "../../store";
    import Loader from "$lib/components/complex/loader.svelte";
    import {Input} from "$lib/components/ui/input";
    import {page} from "$app/stores";
    import {goto} from "$app/navigation";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    import {Separator} from "$lib/components/ui/separator";
    import type {PageData} from "./$types";
    import {Button} from "$lib/components/ui/button";


    export let data: PageData;

    $: wallets = (Res.fromSerial<WalletPrincipalRes[], ProblemDetails>(data.result)
        .match({
            ok: (a: WalletPrincipalRes[]): WalletPrincipalRes[] => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e);
                return null as never;
            }
        }) satisfies Promise<WalletPrincipalRes[]>)
    let searchTerm = $page.url.searchParams.get('search') || "";

    function triggerSearch() {
        goto(`?search=${searchTerm}`,
            {
                keepFocus: true,
                noScroll: true,
            }
        );
    }

</script>

<div class="flex flex-col">
    <div class="flex flex-col w-11/12 max-w-[1200px] mx-auto my-12">
        <Input placeholder="Search for wallets..." bind:value={searchTerm} on:input={triggerSearch}/>
        {#await wallets}
            <Loader/>
        {:then w}
            <Page notFoundMessage="Wallets not found" empty={w.length === 0}>
                <div class="flex flex-col gap-4 my-4">
                    {#each w as wallet}
                        <div>
                            <Card.Root>
                                <Card.Header>
                                    <Card.Title>{wallet.id}</Card.Title>
                                    <Card.Description><a class="hover:underline hover:text-amber-500"
                                                         href="/users/{wallet.userId}"> {wallet.userId} </a>
                                    </Card.Description>
                                </Card.Header>
                                <Card.Content>
                                    <div class="flex gap-8 justify-between items-center flex-wrap">

                                        <div class="flex h-5 items-center space-x-4 text-sm">
                                            <div>USABLE: SGD {wallet.usable.toFixed(2)}</div>
                                            <Separator orientation="vertical"/>
                                            <div>WITHDRAW RESERVE: SGD {wallet.withdrawReserve.toFixed(2)}</div>
                                            <Separator orientation="vertical"/>
                                            <div>BOOKING RESERVE: SGD {wallet.bookingReserve.toFixed(2)}</div>
                                        </div>
                                        <Button href="/wallets/{wallet.id}"
                                                class="max-w-80 lg:max-w-40 w-full">
                                            View Details
                                        </Button>
                                    </div>
                                </Card.Content>
                            </Card.Root>
                        </div>
                    {/each}
                </div>
            </Page>
        {/await}
    </div>
</div>
