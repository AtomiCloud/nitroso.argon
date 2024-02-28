<script>
// @ts-ignore
import Icon from 'svelte-icons-pack/Icon.svelte';
import BsWhatsapp from "svelte-icons-pack/bs/BsWhatsapp.js";
import BsFacebook from "svelte-icons-pack/bs/BsFacebook.js";
import BsInstagram from "svelte-icons-pack/bs/BsInstagram.js";
import BsTelegram from "svelte-icons-pack/bs/BsTelegram.js";
import AiOutlineMail from "svelte-icons-pack/ai/AiOutlineMail.js";
import BsTelephone from "svelte-icons-pack/bs/BsTelephone.js";
</script>

<h2 class="text-lg text-center">Need help? Contact Us!</h2>
<div class="flex flex-wrap align-center justify-center gap-8 p-8">
    <a href="https://wa.me/6588178504" class="cursor-pointer hover:text-green-500">
        <Icon src={BsWhatsapp} size="24" color="currentColor"/>
    </a>
    <a href="https://www.facebook.com/profile.php?id=61554414882276&mibextid=ZbWKwL" class="cursor-pointer hover:text-blue-500">
        <Icon src={BsFacebook} size="24" color="currentColor"/>
    </a>
    <a href="https://www.instagram.com/bunnybooker.sg?utm_source=qr&igsh=MWxrMDFkN2diczlnZg==" class="cursor-pointer hover:text-pink-500">
        <Icon src={BsInstagram} size="24" color="currentColor"/>
    </a>
    <a href="https://t.me/bunnybooker" class="cursor-pointer hover:text-sky-500">
        <Icon src={BsTelegram} size="24" color="currentColor"/>
    </a>
    <a href="mailto:support@bunnybooker.com" class="cursor-pointer hover:text-rose-500">
        <Icon src={AiOutlineMail} size="24" color="currentColor"/>
    </a>
    <a href="tel:+6588178504" class="cursor-pointer hover:text-red-500">
        <Icon src={BsTelephone} size="24" color="currentColor"/>
    </a>
</div>
<div class="flex flex-col justify-center align-center text-center">
    <a href="/policy" class="underline hover:text-amber-300">Delivery, Cancellation & Refund Policy</a>
    <a href="/privacy" class="underline hover:text-amber-300">Privacy Policy</a>
    <a href="/terms" class="underline hover:text-amber-300">Terms of Use</a>
</div>
