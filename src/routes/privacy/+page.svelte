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
            <h1 class="text-6xl">{$_('legal.privacy.heading', { locale: $lang })}</h1>

            <h2 class="py-4 text-xl font-semibold">{$_('legal.privacy.noticeHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.privacy.noticeBody', { locale: $lang })}</p>


            <ol class="my-6 ml-6 list-decimal [&>li]:mt-2">
                <h2 class="py-2 text-xl font-semibold">{$_('legal.privacy.personalDataHeading', { locale: $lang })}</h2>
                <li>
                    <p>{$_('legal.privacy.definitionsIntro', { locale: $lang })}</p>
                    <p class="py-2">{$_('legal.privacy.definitionCustomer', { locale: $lang })}</p>
                    <p class="py-2">{$_('legal.privacy.definitionPersonalData', { locale: $lang })}</p>
                </li>
                <li>{$_('legal.privacy.examplesItem', { locale: $lang })}</li>
                <li>{$_('legal.privacy.otherTermsItem', { locale: $lang })}</li>

                <h2 class="py-2 text-xl font-semibold">{$_('legal.privacy.collectionHeading', { locale: $lang })}</h2>
                <li>{$_('legal.privacy.collectionConsentItem', { locale: $lang })}</li>
                <li>
                    <p>{$_('legal.privacy.purposesIntro', { locale: $lang })}</p>
                    <ol class="my-6 ml-6 list-none [&>li]:mt-2">
                        <li>{$_('legal.privacy.purposeA', { locale: $lang })}</li>
                        <li>{$_('legal.privacy.purposeB', { locale: $lang })}</li>
                        <li>{$_('legal.privacy.purposeC', { locale: $lang })}</li>
                        <li>{$_('legal.privacy.purposeD', { locale: $lang })}</li>
                        <li>{$_('legal.privacy.purposeE', { locale: $lang })}</li>
                        <li>{$_('legal.privacy.purposeF', { locale: $lang })}</li>
                        <li>{$_('legal.privacy.purposeG', { locale: $lang })}</li>
                        <li>{$_('legal.privacy.purposeH', { locale: $lang })}</li>
                        <li>{$_('legal.privacy.purposeI', { locale: $lang })}</li>
                        <li>{$_('legal.privacy.purposeJ', { locale: $lang })}</li>
                    </ol>
                </li>
                <li>
                    <p>{$_('legal.privacy.disclosureIntro', { locale: $lang })}</p>
                    <p class="py-2">{$_('legal.privacy.disclosureA', { locale: $lang })}</p>
                    <p class="py-2">{$_('legal.privacy.disclosureB', { locale: $lang })}</p>

                </li>
                <li>{$_('legal.privacy.purposesContinueItem', { locale: $lang })}</li>

                <h2 class="py-2 text-xl font-semibold">{$_('legal.privacy.withdrawingHeading', { locale: $lang })}</h2>
                <li>{$_('legal.privacy.withdrawingItem1', { locale: $lang })}</li>
                <li>{$_('legal.privacy.withdrawingItem2', { locale: $lang })}</li>
                <li>{$_('legal.privacy.withdrawingItem3', { locale: $lang })}</li>
                <li>{$_('legal.privacy.withdrawingItem4', { locale: $lang })}</li>

                <h2 class="py-2 text-xl font-semibold">{$_('legal.privacy.accessHeading', { locale: $lang })}</h2>
                <li>{$_('legal.privacy.accessItem1', { locale: $lang })}</li>
                <li>{$_('legal.privacy.accessItem2', { locale: $lang })}</li>
                <li>{$_('legal.privacy.accessItem3', { locale: $lang })}</li>

                <h2 class="py-2 text-xl font-semibold">{$_('legal.privacy.protectionHeading', { locale: $lang })}</h2>
                <li>{$_('legal.privacy.protectionItem1', { locale: $lang })}</li>
                <li>{$_('legal.privacy.protectionItem2', { locale: $lang })}</li>


                <h2 class="py-2 text-xl font-semibold">{$_('legal.privacy.accuracyHeading', { locale: $lang })}</h2>
                <li>{$_('legal.privacy.accuracyItem', { locale: $lang })}</li>

                <h2 class="py-2 text-xl font-semibold">{$_('legal.privacy.retentionHeading', { locale: $lang })}</h2>
                <li>{$_('legal.privacy.retentionItem1', { locale: $lang })}</li>
                <li>{$_('legal.privacy.retentionItem2', { locale: $lang })}</li>

                <h2 class="py-2 text-xl font-semibold">{$_('legal.privacy.transfersHeading', { locale: $lang })}</h2>
                <li>{$_('legal.privacy.transfersItem', { locale: $lang })}</li>

                <h2 class="py-2 text-xl font-semibold">{$_('legal.privacy.dpoHeading', { locale: $lang })}</h2>
                <li>{$_('legal.privacy.dpoItem', { locale: $lang })}</li>
                <p class="py-4">
                    <span class="font-semibold">{$_('legal.privacy.dpoTitle', { locale: $lang })}</span><br>
                    {$_('legal.privacy.dpoNameLabel', { locale: $lang })}: Ho Ching Wee <br>
                    {$_('legal.privacy.dpoAddressLabel', { locale: $lang })}: 60 PAYA LEBAR ROAD, #07-54, PAYA LEBAR SQUARE, SINGAPORE 409051 <br>
                    {$_('legal.privacy.dpoEmailLabel', { locale: $lang })}: chingwee@bunnybooker.com <br>
                    {$_('legal.privacy.dpoMobileLabel', { locale: $lang })}: 88178504 <br>
                </p>

                <h2 class="py-2 text-xl font-semibold">{$_('legal.privacy.effectHeading', { locale: $lang })}</h2>
                <li>{$_('legal.privacy.effectItem1', { locale: $lang })}</li>
                <li>{$_('legal.privacy.effectItem2', { locale: $lang })}</li>
            </ol>

            <p>
                {$_('legal.privacy.effectiveDate', { locale: $lang })}<br>
                {$_('legal.privacy.lastUpdated', { locale: $lang })}
            </p>
        </div>
    </div>
</Page>
