<script lang="ts">
    import {Hourglass} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";

    // Marks a Pending booking whose date/time KTMB has not released yet. Pre-orders
    // stay allowed — this is informational, so it is a calm sky tone, not an error.
</script>

<span class="inline-flex items-center justify-center gap-1 self-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800 ring-1 ring-inset ring-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-700">
    <Hourglass class="h-3 w-3"/>
    {$_('bookings.release.badge', { locale: $lang })}
</span>
