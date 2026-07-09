<script lang="ts">
    //@ts-ignore
    import * as Tooltip from "$lib/components/ui/tooltip";
    import {Info} from "lucide-svelte";

    // Shared info tooltip that actually works on BOTH desktop hover and
    // mobile tap. The stock melt/bits tooltip never opens on touch by design:
    // its pointerenter handler ignores touch pointers, and its default
    // closeOnPointerDown=true sets an internal clickedTrigger latch on the
    // tap that also suppresses the focus-open fallback. The previous ad-hoc
    // tap-toggle handlers additionally read `e.originalEvent` when bits-ui
    // re-dispatches melt events with the real PointerEvent at
    // `e.detail.originalEvent`, so the toggle never fired either.

    // Accessible label for the trigger button.
    export let label = "";
    // Extra classes on the floating bubble.
    export let contentClass = "max-w-72";

    let open = false;
    let wrapper: HTMLElement | null = null;

    // Tap toggles the bubble on touch devices; mouse users keep pure hover.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function triggerPointerDown(e: any) {
        const pe: PointerEvent | undefined = e?.detail?.originalEvent;
        if (pe?.pointerType === "touch" || pe?.pointerType === "pen") open = !open;
    }

    // Touch has no "hover away", so a tap anywhere outside the trigger closes
    // an open bubble (the portalled content counts as outside — tapping the
    // bubble itself to dismiss it is fine too).
    function docPointerDown(e: PointerEvent) {
        if (!open) return;
        if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
        const t = e.target;
        if (t instanceof Node && wrapper?.contains(t)) return;
        open = false;
    }
</script>

<svelte:document on:pointerdown={docPointerDown}/>

<span bind:this={wrapper} class="inline-flex">
    <!-- closeOnPointerDown must stay off (see header comment); openDelay
         150ms keeps desktop hover snappy vs melt's sluggish 1s default. -->
    <Tooltip.Root bind:open openDelay={150} closeOnPointerDown={false}>
        <Tooltip.Trigger on:pointerdown={triggerPointerDown} aria-label={label || undefined}>
            <slot name="trigger">
                <Info class="h-4 w-4 text-muted-foreground"/>
            </slot>
        </Tooltip.Trigger>
        <Tooltip.Content class={contentClass}>
            <p class="text-justify"><slot/></p>
        </Tooltip.Content>
    </Tooltip.Root>
</span>
