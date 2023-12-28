<script lang="ts">
    import {config} from "../config/shared";
    import Page from "$lib/components/complex/page.svelte";
    import mascot from "$lib/assets/nitroso-mascot.png";
    import {Button} from "$lib/components/ui/button";
    import {BookOpenCheck} from "lucide-svelte";
    console.log("Configuration", config.app);


</script>

<style lang="css">

</style>

<Page notFoundMessage="Main page cannot be found">
    <div class="flex flex-col gap-4 justify-center align-center w-11/12 max-w-[1200px] mx-auto">
        <div class="flex flex-row-reverse flex-wrap justify-center align-center">
            <div>
                <img src={mascot} alt="BunnyBooker" class="h-128 w-128 md:h-64 md:w-64"/>
            </div>
            <div class="flex flex-col gap-4 justify-evenly align-center">
                <div class="text-5xl md:text-7xl text-center md:text-left ">
                    <span>Bunny</span><span>Booker</span>
                </div>
                <div class="text-lg md:text-xl text-center md:text-left ">
                    <span>Your stress-free ticket booking assistant</span>
                </div>
                <Button>
                    <BookOpenCheck class="mr-2 h-4 w-4"/>
                    Start Booking
                </Button>
            </div>
        </div>

    </div>
</Page>
