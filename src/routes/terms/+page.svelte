<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";


    //@ts-ignore
    import Icon from 'svelte-icons-pack/Icon.svelte';
    import {Footer} from "$lib/components/custom/footer";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";
</script>

<Page notFoundMessage={$_('landing.notFound', { locale: $lang })}>
    <div class="flex flex-col">
        <div class="w-11/12 max-w-[800px] mx-auto py-8">
            <h1 class="text-6xl">{$_('legal.terms.heading', { locale: $lang })}</h1>
            <p class="py-2">{$_('legal.terms.intro1', { locale: $lang })}</p>
            <p class="py-2">{$_('legal.terms.intro2', { locale: $lang })}</p>

            <h2 class="py-2 text-3xl">{$_('legal.terms.accessHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.accessBody', { locale: $lang })}</p>
            <h2 class="py-2 text-3xl">{$_('legal.terms.relyingHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.relyingBody', { locale: $lang })}</p>
            <h2 class="py-2 text-3xl">{$_('legal.terms.securityHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.securityBody', { locale: $lang })}</p>
            <h2 class="py-2 text-3xl">{$_('legal.terms.hyperlinksHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.hyperlinksBody1', { locale: $lang })}</p>
            <p class="py-2">{$_('legal.terms.hyperlinksBody2', { locale: $lang })}</p>
            <h2 class="py-2 text-3xl">{$_('legal.terms.restrictionsHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.restrictionsBody1', { locale: $lang })}</p>
            <p class="py-2">{$_('legal.terms.restrictionsBody2', { locale: $lang })}</p>
            <p class="py-2">{$_('legal.terms.restrictionsBody3', { locale: $lang })}</p>
            <h2 class="py-2 text-3xl">{$_('legal.terms.thirdPartyHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.thirdPartyBody', { locale: $lang })}</p>
            <h2 class="py-2 text-3xl">{$_('legal.terms.nonConfidentialityHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.nonConfidentialityBody', { locale: $lang })}</p>
            <h2 class="py-2 text-3xl">{$_('legal.terms.modificationHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.modificationBody', { locale: $lang })}</p>
            <h2 class="py-2 text-3xl">{$_('legal.terms.privacyHeading', { locale: $lang })}</h2>
            <p class="py-2">
                {$_('legal.terms.privacyBodyPrefix', { locale: $lang })}
                <a href="/privacy" class="underline hover:text-amber-300" > {$_('legal.terms.privacyBodyLink', { locale: $lang })}</a>.
            </p>

            <h2 class="py-2 text-3xl">{$_('legal.terms.registrationHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.registrationBody1', { locale: $lang })}</p>
            <p class="py-2">{$_('legal.terms.registrationBody2', { locale: $lang })}</p>
            <h2 class="py-2 text-3xl">{$_('legal.terms.accuracyHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.accuracyBody1', { locale: $lang })}</p>
            <p class="py-2">{$_('legal.terms.accuracyBody2', { locale: $lang })}</p>
            <h2 class="py-2 text-3xl">{$_('legal.terms.limitationsHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.limitationsBody1', { locale: $lang })}</p>
            <p class="py-2">{$_('legal.terms.limitationsBody2', { locale: $lang })}</p>

            <h2 class="py-2 text-3xl">{$_('legal.terms.responsibilitiesHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.responsibilitiesBody1', { locale: $lang })}</p>
            <p class="py-2">{$_('legal.terms.responsibilitiesBody2', { locale: $lang })}</p>
            <p class="py-2">{$_('legal.terms.responsibilitiesBody3', { locale: $lang })}</p>

            <h2 class="py-2 text-3xl">{$_('legal.terms.covidHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.covidIntro', { locale: $lang })}</p>
            <ul class="my-6 ml-6 list-disc [&>li]:mt-2">
                <li>{$_('legal.terms.covidItem1', { locale: $lang })}</li>
                <li>{$_('legal.terms.covidItem2', { locale: $lang })}</li>
                <li>{$_('legal.terms.covidItem3', { locale: $lang })}</li>
                <li>{$_('legal.terms.covidItem4', { locale: $lang })}</li>
                <li>{$_('legal.terms.covidItem5', { locale: $lang })}</li>
            </ul>
            <h3 class="py-2 text-2xl">{$_('legal.terms.clause1Heading', { locale: $lang })}</h3>
            <p class="py-2">{$_('legal.terms.clause1Body', { locale: $lang })}</p>
            <h2 class="py-2 text-3xl">{$_('legal.terms.vaccinationHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.vaccinationIntro', { locale: $lang })}</p>
            <ul class="my-6 ml-6 list-disc [&>li]:mt-2">
                <li>{$_('legal.terms.vaccinationItem1', { locale: $lang })}</li>
                <li>{$_('legal.terms.vaccinationItem2', { locale: $lang })}</li>
                <li>{$_('legal.terms.vaccinationItem3', { locale: $lang })}</li>
                <li>{$_('legal.terms.vaccinationItem4', { locale: $lang })}</li>
                <li>{$_('legal.terms.vaccinationItem5', { locale: $lang })}</li>

            </ul>
            <p class="py-2">{$_('legal.terms.vaccinationBody1', { locale: $lang })}</p>
            <p class="py-2">{$_('legal.terms.vaccinationBody2', { locale: $lang })}</p>
            <p class="py-2">
                {$_('legal.terms.vaccinationConsentPrefix', { locale: $lang })}
                <a href="/privacy" class="underline hover:text-amber-300">{$_('legal.terms.vaccinationConsentLink', { locale: $lang })}</a>
                {$_('legal.terms.vaccinationConsentSuffix', { locale: $lang })}
            </p>
            <p class="py-2">{$_('legal.terms.vaccinationBody3', { locale: $lang })}</p>
            <p class="py-2">{$_('legal.terms.vaccinationBody4', { locale: $lang })}</p>
            <p class="py-2">{$_('legal.terms.vaccinationBody5', { locale: $lang })}</p>
            <p class="py-2">{$_('legal.terms.vaccinationBody6', { locale: $lang })}</p>
            <p class="py-2">{$_('legal.terms.vaccinationBody7', { locale: $lang })}</p>


            <h2 class="py-2 text-3xl">{$_('legal.terms.deliveryHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.deliveryIntro', { locale: $lang })}</p>
            <ul class="my-6 ml-6 list-disc [&>li]:mt-2">
                <li>{$_('legal.terms.deliveryItem1', { locale: $lang })}</li>
                <li>{$_('legal.terms.deliveryItem2', { locale: $lang })}</li>
                <li>{$_('legal.terms.deliveryItem3', { locale: $lang })}</li>
                <li>{$_('legal.terms.deliveryItem4', { locale: $lang })}</li>
                <li>{$_('legal.terms.deliveryItem5', { locale: $lang })}</li>
                <li>{$_('legal.terms.deliveryItem6', { locale: $lang })}</li>
                <li>{$_('legal.terms.deliveryItem7', { locale: $lang })}</li>
                <li>{$_('legal.terms.deliveryItem8', { locale: $lang })}</li>
            </ul>

            <h2 class="py-2 text-3xl">{$_('legal.terms.fairUseHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.fairUseIntro', { locale: $lang })}</p>
            <ul class="my-6 ml-6 list-disc [&>li]:mt-2">
                <li>{$_('legal.terms.fairUseItem1', { locale: $lang })}</li>
                <li>{$_('legal.terms.fairUseItem2', { locale: $lang })}</li>
                <li>{$_('legal.terms.fairUseItem3', { locale: $lang })}</li>
                <li>{$_('legal.terms.fairUseItem4', { locale: $lang })}</li>
            </ul>
            <p class="py-2">{$_('legal.terms.fairUseConsequencesIntro', { locale: $lang })}</p>
            <ul class="my-6 ml-6 list-disc [&>li]:mt-2">
                <li>{$_('legal.terms.fairUseConsequence1', { locale: $lang })}</li>
                <li>{$_('legal.terms.fairUseConsequence2', { locale: $lang })}</li>
                <li>{$_('legal.terms.fairUseConsequence3', { locale: $lang })}</li>
                <li>{$_('legal.terms.fairUseConsequence4', { locale: $lang })}</li>
            </ul>
            <p class="py-2">{$_('legal.terms.fairUseReserve', { locale: $lang })}</p>
            <h2 class="py-2 text-3xl">{$_('legal.terms.interestsHeading', { locale: $lang })}</h2>
            <p class="py-2">{$_('legal.terms.interestsIntro', { locale: $lang })}</p>
            <ul class="my-6 ml-6 list-disc [&>li]:mt-2">
                <li>{$_('legal.terms.interestsItem1', { locale: $lang })}</li>
                <li>{$_('legal.terms.interestsItem2', { locale: $lang })}</li>
                <li>{$_('legal.terms.interestsItem3', { locale: $lang })}</li>
                <li>{$_('legal.terms.interestsItem4', { locale: $lang })}</li>
                <li>{$_('legal.terms.interestsItem5', { locale: $lang })}</li>
                <li>{$_('legal.terms.interestsItem6', { locale: $lang })}</li>
                <li>{$_('legal.terms.interestsItem7', { locale: $lang })}</li>
            </ul>
        </div>
    </div>
</Page>
