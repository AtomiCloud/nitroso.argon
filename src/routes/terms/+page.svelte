<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";


    //@ts-ignore
    import Icon from 'svelte-icons-pack/Icon.svelte';
    import {Footer} from "$lib/components/custom/footer";
</script>

<Page notFoundMessage="Main page cannot be found">
    <div class="flex flex-col h-[calc(100dvh-4rem)] geo-bg">
        <div class="w-11/12 max-w-[800px] mx-auto py-8">
            <h1 class="text-6xl">Terms and Condition</h1>
            <p class="py-2">
                All access to any area on our websites at BunnyBooker is governed by
                the terms and conditions below ("Terms"). If you are not comfortable with
                any of these Terms, we would advise you to exit. Please continue only if
                you can accept these Terms.
            </p>
            <p class="py-2">
                In these Terms, the words "we," "our," and "us" refer to BunnyBooker.
            </p>

            <h2 class="py-2 text-3xl">Access to BunnyBooker</h2>
            <p class="py-2">
                The accessibility and operation of our website rely on technologies
                outside our control. We cannot guarantee continuous accessibility or
                uninterrupted operation of our website.
            </p>
            <h2 class="py-2 text-3xl">Relying on Information</h2>
            <p class="py-2">
                We provide our website as a general information source only. We are not
                involved in giving professional advice here. The website may not cover
                all information available on a particular issue. We advise that you conduct
                your own checks or obtain professional advice relevant to your particular
                circumstances, outside of our website.
            </p>
            <h2 class="py-2 text-3xl">Security</h2>
            <p class="py-2">
                Where appropriate, we use available technology to protect the security of communications
                made through our website. We do not accept liability for the security, authenticity,
                integrity, or confidentiality of any transactions and other communications made
                through our website. Internet communications may be susceptible to interference or
                interception by third parties. We will do our best, but we cannot make any warranties
                that our website is free of infection by computer viruses or other unauthorized software.
            </p>
            <h2 class="py-2 text-3xl">Hyperlinks</h2>
            <p class="py-2">
                We are not responsible or liable for the availability or content of any other
                Internet site (not provided by us) linked to or from our website. Access to
                any other Internet site is at your own risk. If you create a link or frame
                to our website, you do so at your own risk.
            </p>
            <p class="py-2">
                We reserve the right to object or disable any link or frame to or from our website.
            </p>
            <h2 class="py-2 text-3xl">Restrictions on Use of Materials</h2>
            <p class="py-2">
                All content on this website, including trade names, articles, texts, artwork,
                pictures, photographs, films, the BunnyBooker logo, and related images, are
                protected by applicable laws, including copyright laws, and may not be reproduced
                or appropriated without the prior written consent of the relevant rights holder.
            </p>
            <p class="py-2">
                No license or right is granted, and your access to this website and/or use of
                the online services should not be construed as granting any license or right to use any
                intellectual property appearing on the website without the prior written consent of
                BunnyBooker or the relevant rights holder.
            </p>
            <p class="py-2">
                Modification of any of the materials or use of any of the materials
                for any other purpose will be a violation of BunnyBooker’s copyright.
            </p>
            <h2 class="py-2 text-3xl">Third-Party Content</h2>
            <p class="py-2">
                Third-party content may appear on the website or may be accessible via links from the
                website. BunnyBooker shall not be responsible and assumes no liability for any
                infringement, mistakes, misstatements of law, defamation, libel, slander, omissions,
                falsehood, or profanity in the statements, opinions, representations, or any other
                form of content contained in any third-party content appearing on the website.
            </p>
            <h2 class="py-2 text-3xl">Non-Confidentiality</h2>
            <p class="py-2">
                You agree that all information and/or particulars sent or submitted by you to
                BunnyBooker in relation to the access of this website is non-confidential
                and non-proprietary unless otherwise expressly indicated by you. You further
                undertake not to submit any information and/or other materials which are or
                may be offensive, illegal, or which may not be lawfully disseminated under
                the laws of Singapore or any other relevant country.
            </p>
            <h2 class="py-2 text-3xl">Modification to Terms and Conditions of Use</h2>
            <p class="py-2">
                The Terms and Conditions set out here may be edited from time to time.
                Updated versions of the Terms and Conditions of Use will be posted on the
                website and are effective immediately.
            </p>
            <h2 class="py-2 text-3xl">Privacy</h2>
            <p class="py-2">
                Your use of the website is subject to BunnyBooker’s Privacy Policy, which can be found
                <a href="/privacy" class="underline hover:text-amber-300" > here</a>.
            </p>

            <h2 class="py-2 text-3xl">Registration on Website and Booking Service</h2>
            <p class="py-2">
                Information collected from our users may be used for various reasons.
            </p>
            <p class="py-2">
                We are committed to safeguarding your privacy. We do not disclose specific information
                about our users to any third parties unless so required by law or any government
                agencies. In the event that you participate in contests or other promotional programs
                on our site sponsored or organized by third parties or purchase goods and services offered
                by third parties or offer goods and services to third parties on our sites, your information
                may be disclosed to and used by such third parties.
            </p>
            <h2 class="py-2 text-3xl">Accuracy of Information</h2>
            <p class="py-2">
                You warrant and undertake that all health declarations submitted by you are the complete and
                true declarations of yourself and all the people for whom you are purchasing tickets.
            </p>
            <p class="py-2">
                Please note that if you do not submit full and accurate declarations for all ticket holders,
                you may not be able to purchase tickets to or board the train. BunnyBooker will not be
                liable for inaccurate information inputted by you.
            </p>
            <h2 class="py-2 text-3xl">Limitations</h2>
            <p class="py-2">
                We do not accept liabilities in the event where the train provider postpones, cancels,
                interrupts or stops the Services due to adverse weather, dangerous situations, or any
                other causes beyond our reasonable control. We will do our best to check that the train
                services are available and functioning before accepting ticket orders, but we cannot
                make any warranties that the train is free of fault by wear and tear or other
                technical faults.
            </p>
            <p class="py-2">
                We strive to fulfill all orders. However, in the scenario where we are unable to meet orders
                due to the KTMB site being down, under maintenance or inaccessible for an extended period of
                time, full refunds will be provided and credited to your BunnyBooker account. However,
                we do not accept liabilities outside of providing a full refund for affected tickets.
            </p>

            <h2 class="py-2 text-3xl">Your Responsibilities</h2>
            <p class="py-2">
                All tickets must be collected within the time periods stipulated for you. No refunds will be
                made for uncollected or unused tickets.
            </p>
            <p class="py-2">
                No photography, audio or video recording is allowed during customs check-in unless
                otherwise stated by KTMB.
            </p>
            <p class="py-2">
                You voluntarily assume all risk and danger incidental to the ticket service and in your
                travel destination whether occurring prior to, during or subsequent to the actual ticket
                service or your presence at the travel destination, including any death, personal injury,
                loss, damage or liability.
            </p>

            <h2 class="py-2 text-3xl">Covid-19 Regulations</h2>
            <p class="py-2">
                During the COVID-19 pandemic, without prejudice to any other rights of the KTMB and BunnyBooker,
                and notwithstanding anything to the contrary,  KTMB and BunnyBooker reserve the right not to
                grant refunds for any Tickets purchased for a Train ("Train") in any or all of
                the following circumstances (which are non-exhaustive):
            </p>
            <ul class="my-6 ml-6 list-disc [&>li]:mt-2">
                <li>where the Ticket Holder is well, but does not wish to board the Train for fears of exposure to COVID-19;</li>
                <li>where the Ticket Holder is unwell but tests negative for COVID-19 and/or does not have any COVID-19 related symptoms, and does not board the Train;</li>
                <li>where the Ticket Holder is denied entry or asked to leave the train pursuant to health advisories in clause 1.</li>
                <li>where the Ticket Holder is denied entry to the Train for reasons disclosed to the Ticket Holder in these Terms and Conditions of Sale; and/or</li>
                <li>where the Ticket Holder boards the Train, and subsequently leaves the Train before the Train departs to the destination due to the Ticket Holder feeling unwell.</li>
            </ul>
            <h3 class="py-2 text-2xl">Clause 1.</h3>
            <p class="py-2">
                Ticket Holders must abide by all health and safety requirements as may be
                specified by the Singapore government, including any directions on preventing
                the transmission of COVID-19, and all other health advisories and
                guidelines <b class="font-semibold">("Health Advisories")</b>.
                These include but are not limited to: the
                wearing of masks, using Trace Together/Safe-Entry, vaccination and testing
                protocols, and safe distancing measures. Any Ticket Holder found not adhering
                to any Health Advisory shall also be denied entry to the Train or asked to leave the Venue.
            </p>
            <h2 class="py-2 text-3xl">Vaccination and Testing Protocols</h2>
            <p class="py-2">
                Where required by KTMB:
            </p>
            <ul class="my-6 ml-6 list-disc [&>li]:mt-2">
                <li>You must, at the point of purchase of Tickets, provide true declarations of the COVID-19 vaccination status of every Ticket Holder ("Declaration");</li>
                <li>Ticket Holders who have been fully vaccinated against COVID-19 must at the Venue, display official proof of their COVID-19 vaccination status ("Vaccinated Ticket Holders"); and</li>
                <li>Ticket Holders who have no official proof of full vaccination against COVID-19 ("Unvaccinated Ticket Holders") will:</li>
                <li>If Unvaccinated Ticket Holders are not permitted on the Train, be denied entry;</li>
                <li>If Unvaccinated Ticket Holders are permitted on the Train, they are required to obtain pre-Train or pre-Service testing for COVID-19 ("PET") either at the Venue prior to entry, or at a time and location to be notified to you, and display a negative result report for COVID-19 prior to entry.</li>

            </ul>
            <p class="py-2">
                Any non-compliance with the above requirements will result in denial of entry on the Train.
            </p>
            <p class="py-2">
                You warrant and undertake that all Declarations submitted by you are the complete and true
                Declarations of yourself and all persons for whom you are purchasing Tickets.
            </p>
            <p class="py-2">
                You warrant that you are authorised by all your Ticket Holders, to consent, and hereby consent to,
                BunnyBooker's and KTMB's collection, use, processing and disclosure of all personal
                data contained in the Declarations submitted by you, in accordance with
                <a href="/privacy" class="underline hover:text-amber-300">BunnyBooker's Privacy Policy</a>
                as well as these Terms and Conditions.
            </p>
            <p class="py-2">
                Please note that BunnyBooker and KTMB are required to comply with all Health Advisories.
                These include but are not limited to admission criteria, safe distancing measures,
                such as the appropriate segregation, spacing, and separation of train passengers, and
                rules on maximum seating capacity in trains.
            </p>
            <p class="py-2">
                To enable BunnyBooker and KTMB to comply with Health Advisories, BunnyBookerker and KTMB
                collect your Declarations for the purposes of ascertaining the vaccination status of each
                Ticket Holder. This will enable them to assess travel safety, comply with entry and maximum
                capacity requirements, perform crowd management, arrange for PET, and ensure that your seats,
                time and date of the train are in compliance with all Health Advisories.
            </p>
            <p class="py-2">
                As such, BunnyBooker and KTMB reserves the right to take any actions as may be required
                to comply with any Health Advisories based on the information contained in the
                Declarations provided by you, which may include but are not limited to: reallocating
                or making any changes to your seating arrangements, Ticket date and/or timing; cancelling
                or invalidating any Tickets purchased; denying any Ticket Holder entry to the Event and/or
                the Venue; requiring that Unvaccinated Ticket Holders submit to PET; and postponing or
                cancelling the train.
            </p>
            <p class="py-2">
                The declarations will be for BunnyBooker's and KTMB's internal use and will be accessed
                only by their employees and service providers, and will not be disclosed to any unauthorised
                third parties.
            </p>
            <p class="py-2">
                Please note that if you do not submit full and accurate declarations for all Ticket Holders,
                you may not be able to purchase tickets to or board the train.
            </p>


            <h2 class="py-2 text-3xl">Delivery, Refunds & Exchange Policy</h2>
            <p class="py-2">
                You accept the following terms for delivery, refund and exchange of tickets:
            </p>
            <ul class="my-6 ml-6 list-disc [&>li]:mt-2">
                <li>
                    Full refunds will be provided for tickets that have not been successfully secured by the BunnyBooker system on the KTMB website.
                </li>

                <li>
                    Tickets that have been secured on KTMB's website successfully are not eligible for refunds or exchanges.
                </li>
                <li>
                    Cancellations can be initiated once a ticket is booked. However, please note that no refunds will be provided for cancelled tickets
                    <span class="underline">after</span> the BunnyBooker system successfully secures the ticket on the KTMB website.
                </li>
                <li>
                Once a ticket is ordered and our booking service is engaged, our bunnies will actively attempt to secure your ticket.
            </li>
                <li>
                Booking efforts will continue up until 30 minutes before the scheduled departure time in the chosen train direction.
            </li>
                <li>If successful, you will be promptly notified of your confirmed booking details.</li>
                <li>If unsuccessful, you will be refunded in full as credit in your BunnyBooker wallet, which can be withdrawn.</li>
            </ul>
        </div>
        <div class="w-full bg-slate-800 text-white pb-12 pt-8">
            <Footer/>
        </div>
    </div>

</Page>
