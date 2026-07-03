<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";


    //@ts-ignore
    import Icon from 'svelte-icons-pack/Icon.svelte';
    import {Footer} from "$lib/components/custom/footer";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";
</script>

<style lang="css">
    h1 {
        font-family: 'Cabin', 'sans-serif';
    }

    h2 {
        font-family: 'Raleway', 'sans-serif';
    }
</style>
<Page notFoundMessage={$_('landing.notFound', { locale: $lang })}>
    <div class="flex flex-col">
        <div class="w-11/12 max-w-[800px] mx-auto py-8">
            <h1 class="text-6xl">{$_('legal.policy.heading', { locale: $lang })}</h1>

            <h2 class="pt-12 text-xl font-semibold">{$_('legal.policy.ticketRefundsHeading', { locale: $lang })}</h2>
            <ul class="my-4 ml-6 list-disc [&>li]:mt-2">
                <li>{$_('legal.policy.ticketRefundsItem1', { locale: $lang })}</li>
                <li>{$_('legal.policy.ticketRefundsItem2', { locale: $lang })}</li>
            </ul>

            <h2 class="pt-12  text-xl font-semibold">{$_('legal.policy.cancellationsHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.policy.cancellationsBody', { locale: $lang })}</p>
            <h2 class="pt-12 text-xl font-semibold">{$_('legal.policy.walletWithdrawalHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.policy.walletWithdrawalBody1', { locale: $lang })}</p>
            <p class="py-2">{$_('legal.policy.walletWithdrawalBody2', { locale: $lang })}</p>
            <h2 class="pt-12  text-xl font-semibold">{$_('legal.policy.bookingProcessHeading', { locale: $lang })}</h2>
            <ol class="my-2 ml-6 list-decimal [&>li]:mt-2">
                <li>{$_('legal.policy.bookingProcessStep1', { locale: $lang })}</li>
                <li>{$_('legal.policy.bookingProcessStep2', { locale: $lang })}</li>
                <li>{$_('legal.policy.bookingProcessStep3', { locale: $lang })}</li>
                <li>{$_('legal.policy.bookingProcessStep4', { locale: $lang })}</li>
                <li>{$_('legal.policy.bookingProcessStep5', { locale: $lang })}</li>
                <li>{$_('legal.policy.bookingProcessStep6', { locale: $lang })}</li>
            </ol>

        </div>
    </div>
</Page>
