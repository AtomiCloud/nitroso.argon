<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";


    //@ts-ignore
    import Icon from 'svelte-icons-pack/Icon.svelte';
    import {Res} from "$lib/core/result";
    import type {BookingRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../../errors/problem_details";
    import {problem} from "../../../store";
    import Loader from "$lib/components/complex/loader.svelte";
    import type {PageData} from "./$types";
    import Booking from "$lib/components/entities/Bookings/Booking.svelte";

    export let data: PageData;

    $: booking = (Res.fromSerial<BookingRes, ProblemDetails>(data.result)
        .match({
            ok: (a: BookingRes): BookingRes => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e);
                return null as never;
            }
        }) satisfies Promise<BookingRes>)
</script>

<Page notFoundMessage="Booking cannot be found">
    <div class="border-b border-b-muted">
        <h2 class="py-10 text-3xl lg:text-4xl text-foreground max-w-[1200px] w-11/12 mx-auto">
            Booking
        </h2>
    </div>
    <div class="w-full min-h-[80vh] bg-muted dark:bg-background">
        <div class="flex flex-col w-11/12 max-w-[1200px] mx-auto py-8">
            {#await booking}
                <Loader/>
            {:then b}
                <div class="flex flex-col gap-4">
                    <Booking booking={b}/>
                </div>
            {/await}
        </div>
    </div>

</Page>
