<script lang="ts">
    import {Zap} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";

    // THE priority marker — one premium badge used everywhere a booking's
    // priority status is shown (detail header, list rows). Replaces the old
    // flat amber Badge.
</script>

<span class="inline-flex items-center justify-center gap-1 self-center rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-fuchsia-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm shadow-orange-500/40 ring-1 ring-inset ring-white/25">
    <Zap class="h-3 w-3 fill-current"/>
    {$_('bookingActions.priority.badge', { locale: $lang })}
</span>
