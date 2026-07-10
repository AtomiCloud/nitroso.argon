<script lang="ts">
    import {invalidate} from "$app/navigation";
    import {createEventDispatcher, onMount} from "svelte";
    import {LIVE_PRICING_DEPENDENCY, LIVE_PRICING_REFRESH_MS} from "$lib/api/cost";

    // Lead-time policies and discounts change while a page is open. Refresh
    // visible pricing on a bounded interval and immediately when the customer
    // returns to the tab; never poll a hidden page or overlap requests.
    let refreshing = false;
    const dispatch = createEventDispatcher<{refresh: void}>();

    async function refreshWhenVisible() {
        if (document.hidden || refreshing) return;
        refreshing = true;
        try {
            await invalidate(LIVE_PRICING_DEPENDENCY);
            dispatch("refresh");
        } finally {
            refreshing = false;
        }
    }

    onMount(() => {
        const timer = window.setInterval(refreshWhenVisible, LIVE_PRICING_REFRESH_MS);
        window.addEventListener("focus", refreshWhenVisible);
        document.addEventListener("visibilitychange", refreshWhenVisible);

        return () => {
            window.clearInterval(timer);
            window.removeEventListener("focus", refreshWhenVisible);
            document.removeEventListener("visibilitychange", refreshWhenVisible);
        };
    });
</script>
