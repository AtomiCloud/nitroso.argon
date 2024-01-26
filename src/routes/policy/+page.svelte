<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";


    //@ts-ignore
    import Icon from 'svelte-icons-pack/Icon.svelte';
    import {Footer} from "$lib/components/custom/footer";
</script>

<style lang="css">
    h1 {
        font-family: 'Cabin', 'sans-serif';
    }

    h2 {
        font-family: 'Raleway', 'sans-serif';
    }
</style>
<Page notFoundMessage="Main page cannot be found">
    <div class="flex flex-col">
        <div class="w-11/12 max-w-[800px] mx-auto py-8">
            <h1 class="text-6xl">Delivery, Cancellation & Refund Policy</h1>

            <h2 class="pt-12 text-xl font-semibold">Ticket Refunds</h2>
            <ul class="my-4 ml-6 list-disc [&>li]:mt-2">
                <li>
                    If our system has <span class="font-semibold underline">not</span>
                    successfully secured your ticket on KTMB, you will be eligible for
                    a full refund, which will be provided in the form of credits in your BunnyBooker wallet.
                    You can then withdraw these credits by using the withdrawal system in BunnyBooker.
                </li>
                <li>
                    Tickets that have been secured by our system on KTMB are <span
                        class="font-semibold underline">not</span>
                    eligible for refunds or exchanges.
                </li>
            </ul>

            <h2 class="pt-12  text-xl font-semibold">Cancellations</h2>
            <p class="py-2">
                You can request a cancellation at any time, but please aware that if our
                system has already successfully secured your ticket on KTMB, <span class="font-semibold underline">
                no refunds</span>
                will be provided for the cancelled tickets.
            </p>
            <h2 class="pt-12 text-xl font-semibold">Wallet Withdrawal</h2>
            <p class="py-2">
                We only accept withdrawal via PayNow.
            </p>
            <p class="py-2">
                You can withdraw your wallet balance by submitting a withdrawal request in BunnyBooker site with your
                PayNow details. We will process your withdrawal request within 3 working days. For any conflict, questions
                or concerns, please contact us via WhatsApp, Telegram, or email.
            </p>
            <h2 class="pt-12  text-xl font-semibold">Booking Process</h2>
            <ol class="my-2 ml-6 list-decimal [&>li]:mt-2">
                <li>Top up money into BunnyBooker's wallet via our payment gateway.</li>
                <li>Select tickets you need and place an order.</li>
                <li>
                    Once a ticket is ordered and our booking service is engaged, our system will actively attempt to
                    secure your ticket.
                </li>
                <li>
                    Booking efforts will continue up until 30 minutes before the scheduled departure time in the train
                    direction you ordered.
                </li>
                <li>If successful, you will be promptly notified of your confirmed booking details.</li>
                <li>
                    If unsuccessful, you will be notified and refunded the full amount of the ticket to your BunnyBooker
                    account wallet.
                </li>
            </ol>

        </div>
    </div>
</Page>
