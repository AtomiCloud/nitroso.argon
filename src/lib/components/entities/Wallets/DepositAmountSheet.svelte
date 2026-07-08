<script lang="ts">
    import {createEventDispatcher} from "svelte";
    import {Button} from "$lib/components/ui/button";
    import {X} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang, formatNumber} from "$lib/i18n";

    /** Whether the sheet is visible. Owned by the parent. */
    export let open = false;
    /**
     * The page's current decimal amount (e.g. "12.50"). Used only to seed the
     * cents buffer when the sheet opens — closing without confirming never
     * touches the parent's value.
     */
    export let amount = "";

    const dispatch = createEventDispatcher<{
        /** Fired with the plain decimal string (e.g. "12.50") on Confirm/Enter. */
        confirm: string;
        /** Fired on backdrop click, X, Cancel or Escape — parent value untouched. */
        close: void;
    }>();

    // ATM-style cents buffer: a string of digits representing cents. "1250"
    // renders as 12.50; digits push in from the right, ⌫ pops from the right.
    let buffer = "";

    function amountToCents(decimal: string): string {
        const n = Number(decimal);
        if (!Number.isFinite(n) || n <= 0) return "";
        return String(Math.round(n * 100));
    }

    // Re-seed the buffer from the current page amount each time the sheet opens.
    let wasOpen = false;
    $: {
        if (open && !wasOpen) buffer = amountToCents(amount);
        wasOpen = open;
    }

    const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫', 'C'] as const;
    // Quick chips SET the buffer (they do not add to it).
    const QUICK_AMOUNTS = [10, 25, 50, 100] as const;

    function append(k: string) {
        if (k === 'C') buffer = '';
        else if (k === '⌫') buffer = buffer.slice(0, -1);
        else if (/^\d$/.test(k)) buffer = (buffer + k).replace(/^0+(?=\d)/, '');
    }

    function setQuick(dollars: number) {
        buffer = String(dollars * 100);
    }

    function clear() {
        buffer = '';
    }

    function close() {
        dispatch('close');
    }

    function confirm() {
        // Plain (non-localized) decimal string so the parent's zod coercion parses it.
        dispatch('confirm', (parseInt(buffer || '0', 10) / 100).toFixed(2));
    }

    // Localized readout with exactly 2 decimals, driven by the active locale.
    $: display = formatNumber(parseInt(buffer || '0', 10) / 100, $lang, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    // Physical keyboard support while the sheet is open.
    function onKeydown(e: KeyboardEvent) {
        if (!open) return;
        if (/^\d$/.test(e.key)) {
            e.preventDefault();
            append(e.key);
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            append('⌫');
        } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            confirm();
        }
    }
</script>

<svelte:window on:keydown={onKeydown}/>

{#if open}
    <div class="fixed inset-0 z-50">
        <div class="backdrop absolute inset-0 bg-black/50"
             on:click={close}
             on:keydown={e => { if (e.key === 'Enter' || e.key === ' ') close(); }}
             role="button"
             tabindex={0}
             aria-label={$_('actions.close', { locale: $lang })}></div>
        <div class="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-4">
            <div class="sheet bg-background rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md mx-auto overflow-hidden"
                 role="dialog"
                 aria-modal="true"
                 aria-label={$_('wallets.deposit.keypad.title', { locale: $lang })}>
                <div class="p-4 border-b border-border relative text-center">
                    <div class="text-sm font-medium text-foreground">
                        {$_('wallets.deposit.keypad.title', { locale: $lang })}
                    </div>
                    <button class="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            on:click={close}
                            aria-label={$_('actions.close', { locale: $lang })}
                            type="button">
                        <X class="h-5 w-5"/>
                    </button>
                </div>
                <div class="p-4 space-y-3">
                    <div class="text-center">
                        <div class="inline-flex items-baseline gap-1 text-3xl font-semibold">
                            <span class="text-primary">$</span>
                            <span class="tabular-nums">{display}</span>
                            <span class="text-xs text-muted-foreground">SGD</span>
                        </div>
                    </div>
                    <div class="flex justify-center gap-2">
                        {#each QUICK_AMOUNTS as v}
                            <button class="text-xs rounded-full border px-3 py-1 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                                    on:click={() => setQuick(v)}
                                    type="button">
                                {`$${v}`}
                            </button>
                        {/each}
                    </div>
                    <div class="grid grid-cols-3 gap-2 max-w-xs mx-auto select-none">
                        {#each KEYPAD_KEYS as k}
                            <button class="h-12 rounded-lg border border-border bg-muted/50 text-lg font-medium hover:bg-muted"
                                    on:click={() => append(k)}
                                    aria-label={k === '⌫'
                                        ? $_('wallets.deposit.keypadBackspace', { locale: $lang })
                                        : k === 'C'
                                            ? $_('wallets.deposit.keypad.clear', { locale: $lang })
                                            : undefined}
                                    type="button">
                                {k}
                            </button>
                        {/each}
                    </div>
                    <div class="flex items-center justify-between mt-2">
                        <button class="text-xs text-muted-foreground hover:underline"
                                on:click={clear}
                                type="button">
                            {$_('wallets.deposit.keypad.clear', { locale: $lang })}
                        </button>
                        <div class="flex gap-2">
                            <Button variant="outline" on:click={close} size="sm" type="button">
                                {$_('actions.cancel', { locale: $lang })}
                            </Button>
                            <Button on:click={confirm} size="sm" type="button">
                                {$_('actions.confirm', { locale: $lang })}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    @keyframes fade-in {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes sheet-up {
        from {
            transform: translateY(24px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    .backdrop {
        animation: fade-in 160ms ease-out both;
    }

    .sheet {
        animation: sheet-up 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
</style>
