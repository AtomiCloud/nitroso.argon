<script lang="ts">
    //@ts-ignore
    import Icon from 'svelte-icons-pack/Icon.svelte';
    import {Input} from "$lib/components/ui/input";
    import {page} from "$app/stores";
    import {Button} from "$lib/components/ui/button";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import {onMount, tick} from "svelte";
    import Validation from "$lib/components/core/Validation.svelte";
    import Airwallex from 'airwallex-payment-elements';
    import {toResult} from "$lib/utility";
    import {api} from "../../../store";
    import {toast} from "svelte-sonner";
    import {config} from "../../../config/client";


    let errors: ZodIssue[] = [];
    let taints: Record<string, boolean> = {}
    let submitting = false;

    onMount(() => {
        Airwallex.loadAirwallex({
            env: 'prod'
        })
    })

    const topUpSchema = z.object({
        amount: z
            .coerce
            .number()
            .gte(5, "Top up amount must be greater than 5")
            .finite("Top up amount be a finite number")
            .refine(x => {
                const r = x.toString().split(".")
                if (r.length == 2) return r[1].length <= 2
                return true;
            }, "Maximum precision of 2")
    });
    type TopUpModel = z.infer<typeof topUpSchema>;

    let value = {
        amount: "",
    }

    const onChange = (path: string) => async () => {
        await tick();
        taints[path] = true;
        const r = topUpSchema.safeParse(value);
        if (!r.success) {
            const e = r as SafeParseError<TopUpModel>;
            errors = e.error.errors;
        } else {
            errors = [];
        }
    }

    async function submit() {
        onChange("");
        if (errors.length === 0) {
            const v = topUpSchema.parse(value);
            const wId = $page.data.user?.wallet?.id;
            const uId = $page.data.user?.principal?.id;
            await toResult(() => $api.vPaymentCreate(wId, "1.0", {
                amount: v.amount,
                currency: "SGD",
            }, {
                userId: uId,
            }), "Failed to initialize payment")
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
        }
    }

    $: isValid = errors.length === 0 && Object.entries(taints).length > 0;


</script>

<div class="flex flex-col h-full items-center justify-center w-11/12 h-full max-w-[1200px] mx-auto my-4">
    <div class="flex flex-col gap-2 items-center my-12 md:my-48">
        <h1 class="text-4xl">Deposit</h1>
        <h4 class="text-muted-foreground">Deposit to BunnyBooker</h4>
    </div>

    <div class="text-2xl font-light">
        Balance: S${($page.data.user?.wallet?.usable ?? 0).toFixed(2)}
    </div>
    <div class="flex flex-col gap-2 items-center">
        <Validation {errors} {taints} path="amount">
            <div class="flex gap-2 items-center text-4xl my-8">
                <div>S$</div>
                <Input inputmode="numeric"
                       on:input={onChange("amount")}
                       placeholder="0.00" bind:value={value.amount}
                       class="w-40 text-4xl text-center"/>
            </div>
        </Validation>
    </div>


    <div class="my-12 px-8 text-center">
        How much in SGD would you like to deposit?
    </div>

    <Button class="text-2xl py-8 px-12 my-12 font-light" on:click={submit} disabled={submitting || !isValid}>
        Deposit
    </Button>

</div>
