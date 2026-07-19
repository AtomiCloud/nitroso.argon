<script lang="ts">
    import {Input} from "$lib/components/ui/input";
    import {confirmMatches, confirmProgress, type ConfirmCharState} from "$lib/confirm";

    // Expected confirmation text (e.g. the passenger's full name).
    export let target: string;
    // Two-way bound raw text the user has typed.
    export let value = "";
    // Two-way bound validity, computed here so the parent can gate its button.
    export let valid = false;
    export let placeholder = "";

    // The stored value can carry hidden leading/trailing whitespace (the very
    // bug this fixes), and customers get tripped up by capitalisation, so the
    // matching in $lib/confirm is trimmed + case-insensitive.
    $: cleanTarget = target.trim();
    $: valid = confirmMatches(value, target);
    $: progress = confirmProgress(value, target);
    $: ({cells, overflow, correct: correctCount} = progress);

    // Render spaces with a fixed-width glyph so they stay visible when coloured.
    const show = (ch: string) => (ch === " " ? " " : ch);

    function stateClass(state: ConfirmCharState): string {
        if (state === "correct") return "text-green-600 dark:text-green-400";
        if (state === "wrong") return "text-red-600 dark:text-red-400 bg-red-500/20 rounded-sm";
        return "text-muted-foreground";
    }
</script>

<!-- px-1.5 keeps the input's focus ring (ring-offset-2 extends ~4px past the
     box) clear of the dialog's overflow container, which would otherwise clip it. -->
<div class="flex flex-col gap-2 px-1.5">
    <!-- Live "typeracer" mirror of the confirmation text. Decorative: the real
         input below is what carries value + accessibility. -->
    <div
            class="flex flex-wrap items-center gap-y-1 rounded-md border px-3 py-2 font-mono text-base leading-relaxed tracking-wide select-none transition-colors {valid
            ? 'border-green-500 bg-green-500/5'
            : 'bg-muted/40'}"
            aria-hidden="true"
    >
        {#each cells as cell, i (i)}
            <span class="px-[1px] {stateClass(cell.state)}">{show(cell.ch)}</span>
        {/each}
        {#if overflow}
            <span class="rounded-sm bg-red-500/20 px-[1px] text-red-600 line-through dark:text-red-400"
            >{overflow.replace(/ /g, " ")}</span>
        {/if}
    </div>

    <Input
            {placeholder}
            bind:value
            autocomplete="off"
            autocapitalize="none"
            spellcheck={false}
            aria-label={placeholder}
    />

    <!-- Language-neutral progress: matched characters over total. -->
    <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <div class="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div
                    class="h-full rounded-full transition-all duration-150 {valid ? 'bg-green-500' : 'bg-primary'}"
                    style="width: {cleanTarget.length ? (correctCount / cleanTarget.length) * 100 : 0}%"
            ></div>
        </div>
        <span class="tabular-nums">{correctCount}/{cleanTarget.length}</span>
    </div>
</div>
