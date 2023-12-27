<script lang="ts">
    import {config} from "../config/shared";
    import Page from "$lib/components/complex/page.svelte";
    console.log("Configuration", config.app);


</script>
<Page notFoundMessage="Main page cannot be found">

    <div class="max-w-[1200px] w-11/12 mx-auto">
        <div class="relative text-center text-5xl md:text-8xl  flex flex-col justify-center ">
            <div class="w-full h-full absolute font-semibold
            transition-all duration-500
        bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]
        bg-opacity-[50%]
        from-orange-300 from-0% via-background via-60% to-background to-90% blur opacity-[25%] dark:opacity-[15%]">

            </div>
            <div class="flex flex-col gap-4 items-center mt-4 md:mt-28 mb-4 w-full font-semibold">
                <div class="mx-auto relative p-2 md:p-4  dark:bg-gradient-to-br bg-gradient-to-tr from-red-700 via-orange-400 to-yellow-100 inline-block text-transparent bg-clip-text">BunnyBooker</div>
                <div class="text-2xl md:text-4xl font-light">
                    Stress-free ticket booking
                </div>
            </div>
        </div>

    </div>
</Page>
