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

<section class="mx-auto w-full max-w-2xl px-4 py-8" aria-labelledby="support-heading">
    <h2 id="support-heading" class="text-center text-lg">{$_('footer.contactHelp', {locale: $lang})}</h2>
    <p id="support-timezone" class="mt-1 text-center text-sm text-slate-300">
        {$_('footer.supportEveryDay', {locale: $lang})}
    </p>

    <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <section
            class="rounded-xl border border-white/15 bg-white/5 p-4"
            aria-label={`${$_('footer.supportFrom', {locale: $lang})}: 09:00; ${$_('footer.supportUntil', {locale: $lang})}: 23:59`}
            aria-describedby="support-timezone"
            data-testid="support-window-0900"
        >
            <dl class="grid grid-cols-2 divide-x divide-white/15 rounded-lg bg-slate-950/25 py-3 text-center">
                <div class="px-2">
                    <dt class="text-xs font-medium uppercase tracking-wider text-slate-300">
                        {$_('footer.supportFrom', {locale: $lang})}
                    </dt>
                    <dd class="mt-1 text-xl font-semibold tabular-nums"><time datetime="09:00">09:00</time></dd>
                </div>
                <div class="px-2">
                    <dt class="text-xs font-medium uppercase tracking-wider text-slate-300">
                        {$_('footer.supportUntil', {locale: $lang})}
                    </dt>
                    <dd class="mt-1 text-xl font-semibold tabular-nums"><time datetime="23:59">23:59</time></dd>
                </div>
            </dl>

            <div class="mt-3 flex flex-col gap-1">
                <a href="https://wa.me/6583090333" class="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md px-2 hover:bg-white/5 hover:text-green-500"
                   aria-label={`${$_('footer.whatsapp', {locale: $lang})}: +65 8309 0333`}>
                    <Icon src={BsWhatsapp} size="20" color="currentColor"/>
                    <span class="text-sm">+65 8309 0333</span>
                </a>
                <a href="https://wa.me/6597809828" class="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md px-2 hover:bg-white/5 hover:text-green-500"
                   aria-label={`${$_('footer.whatsapp', {locale: $lang})}: +65 9780 9828`}>
                    <Icon src={BsWhatsapp} size="20" color="currentColor"/>
                    <span class="text-sm">+65 9780 9828</span>
                </a>
            </div>
        </section>

        <section
            class="rounded-xl border border-white/15 bg-white/5 p-4"
            aria-label={`${$_('footer.supportFrom', {locale: $lang})}: 00:00; ${$_('footer.supportUntil', {locale: $lang})}: 08:59`}
            aria-describedby="support-timezone"
            data-testid="support-window-0000"
        >
            <dl class="grid grid-cols-2 divide-x divide-white/15 rounded-lg bg-slate-950/25 py-3 text-center">
                <div class="px-2">
                    <dt class="text-xs font-medium uppercase tracking-wider text-slate-300">
                        {$_('footer.supportFrom', {locale: $lang})}
                    </dt>
                    <dd class="mt-1 text-xl font-semibold tabular-nums"><time datetime="00:00">00:00</time></dd>
                </div>
                <div class="px-2">
                    <dt class="text-xs font-medium uppercase tracking-wider text-slate-300">
                        {$_('footer.supportUntil', {locale: $lang})}
                    </dt>
                    <dd class="mt-1 text-xl font-semibold tabular-nums"><time datetime="08:59">08:59</time></dd>
                </div>
            </dl>

            <div class="mt-3 flex flex-col gap-1">
                <a href="https://wa.me/6588178504" class="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md px-2 hover:bg-white/5 hover:text-green-500"
                   aria-label={`${$_('footer.whatsapp', {locale: $lang})}: +65 8817 8504`}>
                    <Icon src={BsWhatsapp} size="20" color="currentColor"/>
                    <span class="text-sm">+65 8817 8504</span>
                </a>
                <div class="flex items-center justify-center gap-6">
                    <a href="https://t.me/bunnybooker" class="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md hover:bg-white/5 hover:text-sky-500"
                       aria-label={`${$_('footer.telegram', {locale: $lang})}: @bunnybooker`}>
                        <Icon src={BsTelegram} size="20" color="currentColor"/>
                    </a>
                    <a href="mailto:support@bunnybooker.com" class="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md hover:bg-white/5 hover:text-rose-500"
                       aria-label={`${$_('footer.email', {locale: $lang})}: support@bunnybooker.com`}>
                        <Icon src={AiOutlineMail} size="20" color="currentColor"/>
                    </a>
                    <a href="tel:+6588178504" class="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md hover:bg-white/5 hover:text-red-500"
                       aria-label={`${$_('footer.phone', {locale: $lang})}: +65 8817 8504`}>
                        <Icon src={BsTelephone} size="20" color="currentColor"/>
                    </a>
                </div>
            </div>
        </section>
    </div>
</section>

<div class="flex flex-wrap align-center justify-center gap-8 pb-8">
    <a href="https://www.facebook.com/profile.php?id=61554414882276&mibextid=ZbWKwL" class="flex h-11 w-11 items-center justify-center rounded-md cursor-pointer hover:text-blue-500"
       aria-label="Facebook">
        <Icon src={BsFacebook} size="24" color="currentColor"/>
    </a>
    <a href="https://www.instagram.com/bunnybooker.sg?utm_source=qr&igsh=MWxrMDFkN2diczlnZg==" class="flex h-11 w-11 items-center justify-center rounded-md cursor-pointer hover:text-pink-500"
       aria-label="Instagram">
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
