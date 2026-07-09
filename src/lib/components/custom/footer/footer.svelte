<script>
// @ts-ignore
import Icon from 'svelte-icons-pack/Icon.svelte';
import BsWhatsapp from "svelte-icons-pack/bs/BsWhatsapp.js";
import BsFacebook from "svelte-icons-pack/bs/BsFacebook.js";
import BsInstagram from "svelte-icons-pack/bs/BsInstagram.js";
import BsTelegram from "svelte-icons-pack/bs/BsTelegram.js";
import AiOutlineMail from "svelte-icons-pack/ai/AiOutlineMail.js";
import BsTelephone from "svelte-icons-pack/bs/BsTelephone.js";
import {_} from "svelte-i18n";
import {lang} from "$lib/i18n";
</script>

<h2 class="text-lg text-center">{$_('footer.contactHelp', {locale: $lang})}</h2>

<div class="flex flex-wrap justify-center gap-8 p-8">
    <!-- Singapore-hours support: WhatsApp, staffed on SGT time -->
    <div class="flex flex-col items-center gap-3">
        <h3 class="text-sm font-semibold">{$_('footer.supportSgt', {locale: $lang})}</h3>
        <a href="https://wa.me/6583090333" class="flex items-center gap-2 cursor-pointer hover:text-green-500">
            <Icon src={BsWhatsapp} size="20" color="currentColor"/>
            <span class="text-sm">+65 8309 0333</span>
        </a>
        <a href="https://wa.me/6597809828" class="flex items-center gap-2 cursor-pointer hover:text-green-500">
            <Icon src={BsWhatsapp} size="20" color="currentColor"/>
            <span class="text-sm">+65 9780 9828</span>
        </a>
    </div>

    <!-- California-hours support: the original contact set, staffed on PT time -->
    <div class="flex flex-col items-center gap-3">
        <h3 class="text-sm font-semibold">{$_('footer.supportUs', {locale: $lang})}</h3>
        <a href="https://wa.me/6588178504" class="flex items-center gap-2 cursor-pointer hover:text-green-500">
            <Icon src={BsWhatsapp} size="20" color="currentColor"/>
            <span class="text-sm">+65 8817 8504</span>
        </a>
        <div class="flex items-center gap-6">
            <a href="https://t.me/bunnybooker" class="cursor-pointer hover:text-sky-500">
                <Icon src={BsTelegram} size="20" color="currentColor"/>
            </a>
            <a href="mailto:support@bunnybooker.com" class="cursor-pointer hover:text-rose-500">
                <Icon src={AiOutlineMail} size="20" color="currentColor"/>
            </a>
            <a href="tel:+6588178504" class="cursor-pointer hover:text-red-500">
                <Icon src={BsTelephone} size="20" color="currentColor"/>
            </a>
        </div>
    </div>
</div>

<div class="flex flex-wrap align-center justify-center gap-8 pb-8">
    <a href="https://www.facebook.com/profile.php?id=61554414882276&mibextid=ZbWKwL" class="cursor-pointer hover:text-blue-500">
        <Icon src={BsFacebook} size="24" color="currentColor"/>
    </a>
    <a href="https://www.instagram.com/bunnybooker.sg?utm_source=qr&igsh=MWxrMDFkN2diczlnZg==" class="cursor-pointer hover:text-pink-500">
        <Icon src={BsInstagram} size="24" color="currentColor"/>
    </a>
</div>

<div class="flex flex-col justify-center align-center text-center">
    <a href="/policy" class="underline hover:text-amber-300">{$_('footer.refundPolicy', {locale: $lang})}</a>
    <a href="/privacy" class="underline hover:text-amber-300">{$_('footer.privacyPolicy', {locale: $lang})}</a>
    <a href="/terms" class="underline hover:text-amber-300">{$_('footer.termsOfUse', {locale: $lang})}</a>
</div>
<div class="flex flex-col gap-4 my-12">
    <div class="text-center ">BUNNYBOOKER</div>
    <div class="text-center">
        60 PAYA LEBAR ROAD <br>
        #07-54, PAYA LEBAR SQUARE <br>
        SINGAPORE 409051
    </div>
</div>
