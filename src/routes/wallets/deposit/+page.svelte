<script lang="ts">
    //@ts-ignore
    import Icon from 'svelte-icons-pack/Icon.svelte';
    import {Input} from "$lib/components/ui/input";
    import {page} from "$app/stores";
    import {Button} from "$lib/components/ui/button";
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Tooltip from "$lib/components/ui/tooltip";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import {onMount, tick} from "svelte";
    import Validation from "$lib/components/core/Validation.svelte";
    import Airwallex from 'airwallex-payment-elements';
    import {toResult} from "$lib/utility";
    import {api} from "../../../store";
    import {toast} from "svelte-sonner";
    import {config} from "../../../config/client";
    import {Info, LucideLoader} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatNumber} from "$lib/i18n";


    let errors: ZodIssue[] = [];
    let taints: Record<string, boolean> = {}
    let submitting = false;

    // withdrawal fee rate (e.g. 0.04 = 4%), shown in the "deposits are free"
    // notice. Falls back to the static 4% copy if the endpoint fails.
    let feeRate: number | null = null;

    onMount(() => {
        Airwallex.loadAirwallex({
            env: 'prod'
        })
        loadFeeRate();
    })

    async function loadFeeRate() {
        await toResult(() => $api.vWithdrawalFeeList("1.0"), $_('wallets.deposit.feeLoadFailed', { locale: $lang }))
            .match({
                ok: (f) => {
                    feeRate = f.withdrawFeeRate;
                },
                err: (e) => {
                    console.error(e);
                    feeRate = null;
                }
            });
    }

    $: feeRatePercent = formatNumber((feeRate ?? 0.04) * 100, $lang, {maximumFractionDigits: 2});

    // Localized validation schema — rebuilt when the active locale changes so the
    // rendered Zod messages follow the language (AC5). Sourced from the
    // `validation.topup.*` catalog keys, SSR-safe via the explicit `{ locale }`,
    // mirroring the in-component pattern in CreateWithdrawal.svelte.
    $: topUpSchema = z.object({
        amount: z
            .coerce
            .number()
            .gte(5, $_('validation.topup.min', { locale: $lang, values: { min: 5 } }))
            .finite($_('validation.topup.finite', { locale: $lang }))
            .refine(x => {
                const r = x.toString().split(".")
                if (r.length == 2) return r[1].length <= 2
                return true;
            }, $_('validation.topup.precision', { locale: $lang, values: { max: 2 } }))
    });
    type TopUpModel = z.infer<typeof topUpSchema>;

    let value = {
        amount: "",
    }

    const onChange = (path: string) => async () => {
        await tick();
        taints[path] = true;
        validate();
    }

    function validate() {
        const r = topUpSchema.safeParse(value);
        if (!r.success) {
            const e = r as SafeParseError<TopUpModel>;
            errors = e.error.errors;
        } else {
            errors = [];
        }
    }

    // Quick-amount chips: add to whatever is already typed (an empty or
    // non-numeric field counts as 0), then run the normal validation path.
    const QUICK_AMOUNTS = [10, 50, 100];

    function addAmount(n: number) {
        const current = Number(value.amount);
        const base = Number.isFinite(current) ? current : 0;
        value.amount = String(Math.round((base + n) * 100) / 100);
        taints["amount"] = true;
        validate();
    }

    // Re-run validation whenever the locale-rebuilt schema changes, so an error
    // already on screen re-renders in the new language after a no-reload language
    // switch (AC5). `errors` stores the localized ZodIssue.message captured at
    // parse time, so without this the visible message would stay stale until the
    // field is edited. Guarded on taints so it never surfaces errors before the
    // user has interacted.
    $: revalidateOnLocale(topUpSchema);

    function revalidateOnLocale(_schema: typeof topUpSchema) {
        if (Object.keys(taints).length === 0) return;
        validate();
    }

    async function submit() {
        onChange("");
        if (errors.length === 0) {
            submitting = true;
            const v = topUpSchema.parse(value);
            const wId = $page.data.user?.wallet?.id;
            const uId = $page.data.user?.principal?.id;
            await toResult(() => $api.vPaymentCreate(wId, "1.0", {
                amount: v.amount,
                currency: "SGD",
            }, {
                userId: uId,
            }), $_('wallets.deposit.initError', { locale: $lang }))
                .match({
                    err: e => {
                        console.error(e);
                        toast.error(e.detail ?? e.type);
                    },
                    ok: o => {
                        Airwallex.redirectToCheckout({
                            env: 'prod',
                            intent_id: o.externalReference,
                            client_secret: o.secret,
                            currency: "SGD",
                            successUrl: `${config.baseUrl}/wallets/deposit/success`,
                            failUrl: `${config.baseUrl}/wallets/deposit/failed`,
                            cancelUrl: `${config.baseUrl}/wallets/deposit/cancel`,
                        })
                    }
                });
            submitting = false;
        }
    }

    $: isValid = errors.length === 0 && Object.entries(taints).length > 0;


</script>

<div class="flex flex-col items-center w-11/12 max-w-[1200px] mx-auto my-12 md:my-24">
    <Card.Root class="w-full max-w-lg">
        <Card.Header>
            <Card.Title class="text-3xl">{$_('wallets.deposit.title', { locale: $lang })}</Card.Title>
            <Card.Description>{$_('wallets.deposit.subtitle', { locale: $lang })}</Card.Description>
        </Card.Header>
        <Card.Content>
            <div class="flex flex-col gap-6">
                <div class="flex flex-col items-center gap-1 rounded-lg bg-muted py-6">
                    <div class="text-3xl font-light">{formatMoney($page.data.user?.wallet?.usable ?? 0, $lang)}</div>
                    <div class="text-sm text-muted-foreground">{$_('fields.balance', { locale: $lang })}</div>
                </div>

                <div class="text-center text-sm text-muted-foreground">
                    {$_('wallets.deposit.prompt', { locale: $lang })}
                </div>

                <Validation {errors} {taints} path="amount" classNames="items-center">
                    <div class="flex gap-2 items-center text-4xl">
                        <div>S$</div>
                        <Input inputmode="numeric"
                               on:input={onChange("amount")}
                               placeholder="0.00" bind:value={value.amount}
                               class="w-40 text-4xl text-center"/>
                    </div>
                </Validation>

                <div class="flex justify-center gap-2">
                    {#each QUICK_AMOUNTS as q}
                        <Button variant="outline" size="sm" on:click={() => addAmount(q)}>
                            +{formatMoney(q, $lang, {maximumFractionDigits: 0})}
                        </Button>
                    {/each}
                </div>

                <div class="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <span>{$_('wallets.deposit.feeNotice', { locale: $lang, values: { rate: feeRatePercent } })}</span>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Info class="h-4 w-4"/>
                        </Tooltip.Trigger>
                        <Tooltip.Content class="max-w-72">
                            <p class="text-justify">{$_('wallets.deposit.feeTooltip', { locale: $lang, values: { rate: feeRatePercent } })}</p>
                        </Tooltip.Content>
                    </Tooltip.Root>
                </div>
            </div>
        </Card.Content>
        <Card.Footer>
            <Button class="w-full text-lg py-6" on:click={submit} disabled={submitting || !isValid}>
                {#if submitting}
                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                {/if}
                {$_('wallets.deposit.title', { locale: $lang })}
            </Button>
        </Card.Footer>
    </Card.Root>
</div>
