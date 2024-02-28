<script lang="ts">
    import {page} from "$app/stores";
    import {Button} from "$lib/components/ui/form";
    import Lottie from "$lib/components/complex/lottie.svelte";
    import {animations} from "$lib/design";
    import {ShoppingBasket, LucideTicket} from "lucide-svelte";


    let date = $page.url.searchParams.get("date");
    let direction = $page.url.searchParams.get("direction");
    let time = $page.url.searchParams.get("time");
    let userId = $page.url.searchParams.get("userId");
    let name = $page.url.searchParams.get("name");
    let passport = $page.url.searchParams.get("passport");



</script>

<div class="flex flex-col" style="height: calc(100dvh - 4rem)">
    <div class="flex flex-col h-full items-center justify-between w-11/12 h-full max-w-[1200px] mx-auto my-4">
        <div class="text-4xl mt-12 md:mt-48">Success!</div>
        <div class="w-full max-w-[400px]">
            <Lottie autoplay={true} loop={false} speed={1} lottieJson={animations.success}/>

        </div>
        <div class="flex flex-col gap-2 items-center">
            <div class="text-xl text-center">Successfully purchased booking</div>
            <div class="flex gap-4">
                <div class="text-muted-foreground text-sm font-light">{name}</div>
                <div class="text-muted-foreground text-sm font-light">{passport}</div>
            </div>

        </div>
        <div class="flex flex-col items-center gap-8 mb-24 md:mb-48">
            <div class="text-2xl font-light">
                Balance: S${($page.data.user?.wallet?.usable ?? 0).toFixed(2)}
            </div>
            <div class="flex gap-4 justify-center flex-wrap items-center">
                <Button class="w-full md:w-64" href="/bookings/purchase?date={date}&time={time}&direction={direction}&userId={userId}">
                    <ShoppingBasket class="mr-2 h-4 w-4"/>
                    Purchase Another Booking
                </Button>
                <Button class="w-full md:w-64"  href="/bookings">
                    <LucideTicket class="mr-2 h-4 w-4"/>
                    View Bookings
                </Button>
            </div>

        </div>


    </div>
</div>
