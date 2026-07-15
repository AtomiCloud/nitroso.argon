<script lang="ts">
    import { X } from "lucide-svelte";
    import { _ } from "svelte-i18n";
    import { lang } from "$lib/i18n";
    import { Button } from "$lib/components/ui/button";
    import { isBeforeHistoryGate, type YearMonth } from "./history-gate-note";

    // Dismissable hint that this page's pre-June 2026 history may look empty
    // for non-owner admins. zinc clamps /Booking/analysis/*, /Booking/pnl/
    // terminal and /User/{id}/pnl to June 2026+ unless the caller has the
    // 'owner' role — owners see everything. The UI can't tell which role the
    // caller has, so the note is purely range-triggered: when the picked
    // range starts before June 2026, show it once per page-load per range.
    //
    // Dismissal is persisted in sessionStorage under one shared key, so
    // dismissing the note on any of the three pages silences it everywhere
    // for the rest of the browser tab session (a new tab brings it back).
    export let from: YearMonth | null | undefined = null;

    const storageKey = "historyGateNote.dismissed";

    function dismiss() {
        try {
            sessionStorage.setItem(storageKey, "1");
        } catch {
            // private mode / locked-down storage — fine, just means the
            // note shows again next render
        }
        dismissed = true;
    }

    let dismissed = false;
    $: dismissed = (() => {
        try {
            return sessionStorage.getItem(storageKey) === "1";
        } catch {
            return false;
        }
    })();

    $: show = !dismissed && isBeforeHistoryGate(from);
</script>

{#if show}
    <div
        class="mt-2 flex items-start gap-2 rounded-md border bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground"
        role="note"
    >
        <p class="flex-1 leading-snug">
            {$_("historyGate.note", { locale: $lang })}
        </p>
        <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6 shrink-0"
            aria-label={$_("historyGate.dismiss", { locale: $lang })}
            title={$_("historyGate.dismiss", { locale: $lang })}
            on:click={dismiss}
        >
            <X class="h-3.5 w-3.5" />
        </Button>
    </div>
{/if}
