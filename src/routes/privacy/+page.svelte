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
    <div class="flex flex-col h-[calc(100dvh-4rem)] geo-bg">
        <div class="w-11/12 max-w-[800px] mx-auto py-8">
            <h1 class="text-6xl">Privacy Policy</h1>

            <h2 class="py-4 text-xl font-semibold">DATA PROTECTION NOTICE</h2>
            <p class="py-2">
                This Data Protection Notice (<span class="font-semibold">"Notice</span>")
                sets out the basis which BunnyBooker (<span class="font-semibold">"we"</span>,
                <span class="font-semibold">"us"</span>, or <span class="font-semibold">"our"</span>)
                may collect, use, disclose or otherwise process personal data of our customers in accordance  with
                the Personal Data Protection Act (<span class="font-semibold">"PDPA"</span>).
                This Notice applies to personal data in our possession
                or under our control, including personal data in the possession of organisations which we have
                engaged to collect, use, disclose or process personal data for our purposes.
            </p>


            <ol class="my-6 ml-6 list-decimal [&>li]:mt-2">
                <h2 class="py-2 text-xl font-semibold">PERSONAL DATA</h2>
                <li>
                    <p>As used in this Notice:</p>
                    <p class="py-2">
                        <span class="font-semibold">"customer" </span>
                            means an individual who (a) has contacted us through any means to find
                        out more  about any goods or services we provide, or (b) may, or has,
                        entered into a contract with us for  the supply of any goods or services by us; and
                    </p>
                    <p class="py-2">
                        <span class="font-semibold">"personal data" </span>
                        means data, whether true or not, about a customer who can be
                        identified:  (a) from that data; or (b) from that data and other information to
                        which we have or are likely  to have access.
                    </p>
                </li>
                <li>
                    Depending on the nature of your interaction with us, some examples of personal data
                    which we may collect from you include your name and identification information such as
                    your full name, passport number, passport expiry date, contact information such as your
                    email address, mobile number, nationality, gender, date of birth, marital status,
                    photographs and other audio-visual  information and financial information such as credit
                    card numbers,  debit card numbers or bank account information.
                </li>
                <li>
                    Other terms used in this Notice shall have the meanings given to them in the PDPA
                    (where the  context so permits).
                </li>

                <h2 class="py-2 text-xl font-semibold">COLLECTION, USE AND DISCLOSURE OF PERSONAL DATA </h2>
                <li>
                    We generally do not collect your personal data unless (a) it is provided to us
                    voluntarily by you  directly or via a third party who has been duly authorised by
                    you to disclose your personal  data to us (your “authorised representative”) after
                    (i) you (or your authorised representative)  have been notified of the purposes for
                    which the data is collected, and (ii) you (or your  authorised representative) have
                    provided written consent to the collection and usage of your  personal data for those
                    purposes, or (b) collection and use of personal data without consent  is permitted or
                    required by the PDPA or other laws. We shall seek your consent before  collecting any
                    additional personal data and before using your personal data for a purpose  which has
                    not been notified to you (except where permitted or authorised by law).
                </li>
                <li>
                    <p>We may collect and use your personal data for any or all of the following purposes:  </p>
                    <ol class="my-6 ml-6 list-none [&>li]:mt-2">
                        <li>(a) performing obligations in the course of or in connection with our provision of the goods and/or services requested by you;</li>
                        <li>(b) verifying your identity;</li>
                        <li>(c) responding to, handling, and processing queries, requests, applications, complaints,  and feedback from you;</li>
                        <li>(d) managing your relationship with us;</li>
                        <li>(e) processing payment or credit transactions;</li>
                        <li>(f) sending your marketing information about our goods or services including notifying you of our marketing events, initiatives and promotions, lucky draws, membership  and rewards schemes and other promotions;</li>
                        <li>(g) complying with any applicable laws, regulations, codes of practice, guidelines, or rules,  or to assist in law enforcement and investigations conducted by any governmental  and/or regulatory authority;</li>
                        <li>(h) any other purposes for which you have provided the information;</li>
                        <li>(i) transmitting to any unaffiliated third parties including our third party service  providers and agents, and relevant governmental and/or regulatory authorities, whether in Singapore or abroad, for the aforementioned purposes; and</li>
                        <li>(j) any other incidental business purposes related to or in connection with the above.</li>
                    </ol>
                </li>
                <li>
                    <p>We may disclose your personal data:  </p>
                    <p class="py-2">
                        (a) where such disclosure is required for performing obligations in the course
                        of or in  connection with our provision of the goods or services requested by you; or
                    </p>
                    <p class="py-2">
                        (b) to third party service providers, agents and other organisations
                        we have engaged to  perform any of the functions listed in clause 5 above for us.
                    </p>

                </li>
                <li>
                    The purposes listed in the above clauses may continue to apply even in situations where your
                    relationship with us (for example, pursuant to a contract) has been terminated or altered
                    in  any way, for a reasonable period thereafter (including, where applicable, a period to
                    enable  us to enforce our rights under any contract with you).
                </li>

                <h2 class="py-2 text-xl font-semibold">WITHDRAWING YOUR CONSENT</h2>
                <li>
                    The consent that you provide for the collection, use and disclosure of your personal data will
                    remain valid until such time it is being withdrawn by you in writing. You may withdraw consent
                    and request us to stop using and/or disclosing your personal data for any or all of the purposes
                    listed above by submitting your request in writing or via email to our Data Protection Officer
                    at the contact details provided below.
                </li>
                <li>
                    Upon receipt of your written request to withdraw your consent, we may require reasonable
                    time (depending on the complexity of the request and its impact on our relationship with you)
                    for your request to be processed and for us to notify you of the consequences of us acceding
                    to the same, including any legal consequences which may affect your rights and liabilities to
                    us. In general, we shall seek to process your request within ten (10) business days of receiving
                    it.
                </li>
                <li>
                    Whilst we respect your decision to withdraw your consent, please note that depending on the
                    nature and scope of your request, we may not be in a position to continue providing our goods
                    or services to you and we shall, in such circumstances, notify you before completing the
                    processing of your request. Should you decide to cancel your withdrawal of consent, please
                    inform us in writing in the manner described in clause 8 above.
                </li>
                <li>
                    Please note that withdrawing consent does not affect our right to continue to collect, use and
                    disclose personal data where such collection, use and disclose without consent is permitted
                    or required under applicable laws.
                </li>

                <h2 class="py-2 text-xl font-semibold">ACCESS TO AND CORRECTION OF PERSONAL DATA</h2>
                <li>
                    If you wish to make (a) an access request for access to a copy of the personal data which we
                    hold about you or information about the ways in which we use or disclose your personal data,
                    or (b) a correction request to correct or update any of your personal data which we hold about
                    you, you may submit your request in writing or via email to our Data Protection Officer at the
                    contact details provided below.
                </li>
                <li>
                    Please note that a reasonable fee may be charged for an access request. If so, we will inform
                    you of the fee before processing your request.
                </li>
                <li>
                    We will respond to your request as soon as reasonably possible. Should we not be able to respond
                    to your request within thirty (30) days after receiving your request, we will inform you in
                    writing within thirty (30) days of the time by which we will be able to respond to your
                    request. If we are unable to provide you with any personal data or to make a correction
                    requested by you, we shall generally inform you of the reasons why we are unable to do so
                    (except where we are not required to do so under the PDPA).
                </li>

                <h2 class="py-2 text-xl font-semibold">PROTECTION OF PERSONAL DATA</h2>
                <li>
                    To safeguard your personal data from unauthorised access, collection, use, disclosure,
                    copying,  modification, disposal or similar risks, we have introduced appropriate
                    administrative,  physical and technical measures such as up-to-date antivirus protection,
                    encryption and the  use of privacy filters to secure all storage and transmission of
                    personal data by us, and disclosing personal data both internally and to our authorised
                    third party service providers  and agents only on a need-to-know basis.
                </li>
                <li>
                    You should be aware, however, that no method of transmission over the Internet or method
                    of electronic storage is completely secure. While security cannot be guaranteed, we strive
                    to  protect the security of your information and are constantly reviewing and enhancing our
                    information security measures.
                </li>


                <h2 class="py-2 text-xl font-semibold">ACCURACY OF PERSONAL DATA</h2>
                <li>
                    We generally rely on personal data provided by you (or your authorised representative). In
                    order to ensure that your personal data is current, complete and accurate, please update us
                    if there are changes to your personal data by informing our Data Protection Officer in writing
                    or via email at the contact details provided below.
                </li>

                <h2 class="py-2 text-xl font-semibold">RETENTION OF PERSONAL DATA</h2>
                <li>
                    We may retain your personal data for as long as it is necessary to fulfil the purpose for which
                    it was collected, or as required or permitted by applicable laws.
                </li>
                <li>
                    We will cease to retain your personal data, or remove the means by which the data can be
                    associated with you, as soon as it is reasonable to assume that such retention no longer serves
                    the purpose for which the personal data was collected, and is no longer necessary for legal or
                    business purposes.
                </li>

                <h2 class="py-2 text-xl font-semibold">RTRANSFERS OF PERSONAL DATA OUTSIDE OF SINGAPORE</h2>
                <li>
                    We generally do not transfer your personal data to countries outside of Singapore. However,
                    if we do so, we will obtain your consent for the transfer to be made and we will take steps to
                    ensure that your personal data continues to receive a standard of protection that is at least
                    comparable to that provided under the PDPA.
                </li>

                <h2 class="py-2 text-xl font-semibold">DATA PROTECTION OFFICER</h2>
                <li>
                    You may contact our Data Protection Officer if you have any enquiries or feedback on our
                    personal data protection policies and procedures, or if you wish to make any request, in the  following manner:
                </li>
                <p class="py-4">
                    <span class="font-semibold">Data Protection Officer</span><br>
                    Name: Ho Ching Wee <br>
                    Address: Blk 708 Hougang Ave 2, #05-75 <br>
                    Email: chingwee@bunnybooker.com <br>
                    Mobile: 88178504 <br>
                </p>

                <h2 class="py-2 text-xl font-semibold">EFFECT OF NOTICE AND CHANGES TO NOTICE</h2>
                <li>
                    This Notice applies in conjunction with any other notices,
                    contractual clauses and consent  clauses that apply in relation to the
                    collection, use and disclosure of your personal data by us.
                </li>
                <li>
                    We may revise this Notice from time to time without any prior notice.
                    You may determine if  any such revision has taken place by referring to
                    the date on which this Notice was last  updated. Your continued use of
                    our services constitutes your acknowledgement and  acceptance of such changes.
                </li>
            </ol>

            <p>
                Effective date: 31/12/2023<br>
                Last updated:  31/12/2023
            </p>
        </div>
        <div class="w-full bg-slate-800 text-white pb-12 pt-8">
            <Footer/>
        </div>
    </div>
</Page>
