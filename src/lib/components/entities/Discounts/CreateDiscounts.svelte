<script lang="ts">

    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {AlertTriangle, LucideLoader, LucidePlusCircle, LucideTrash2} from "lucide-svelte";

    // @ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    // @ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import type {CreateDiscountReq} from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    // @ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import {Input} from "$lib/components/ui/input";
    import Validation from "$lib/components/core/Validation.svelte";
    import SlotMatchers from "./SlotMatchers.svelte";
    import {DISCOUNT_MATCH_MODE, DISCOUNT_MATCH_TYPE, DISCOUNT_TYPE} from "../../../../routes/discounts/status";
    import {tick} from "svelte";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";

    let dialogOpen = false;

    // optional slot matchers (date/time/day/direction/lead-time/window),
    // tap-only controls shared with the update dialog
    let slotMatchers: SlotMatchers;

    const createDiscountSchema = z.object({
        target: z.object({
            matchMode: z.enum(['All', 'Any', 'None']),
            matches: z.array(z.object({
                matchType: z.enum(['Role', 'UserId']),
                value: z.string().min(1).max(256),
            }).required()),
        }).required(),
        record: z.object({
            name: z.string().min(1).max(256),
            description: z.string().min(2).max(2048),
            amount: z
                .coerce
                .number()
                .min(0),
            type: z
                .enum(['Percentage', 'Flat']),
        }).required(),
    }).required();

    const val: CreateDiscountReq = {
        target: {
            // No user/role targeting means the discount is available to
            // everyone; slot matchers (including early-buy lead time) still
            // narrow when it applies.
            matchMode: "None",
            matches: [],
        },
        record: {
            name: "",
            description: "",
            amount: 0,
            type: "Percentage",
        }
    }

    let errors: ZodIssue[] = [];

    let taints: Record<string, boolean> = {}

    const onChange = (path: string) => async () => {
        await tick();
        taints[path] = true;
        const r = createDiscountSchema.safeParse(val);

        if (!r.success) {
            const e = r as SafeParseError<CreateDiscountReq>;
            errors = e.error.errors;
        } else {
            errors = [];
        }
    }


    function addTarget() {
        val.target.matches = [...(val.target.matches ?? []), {
            matchType: "",
            value: "",
        }]
    }

    const deleteTarget = (i: number) => () => {
        val.target.matches = val.target.matches.filter((_, j) => j !== i);
    }

    async function submit() {
        onChange("");
        const slotOk = slotMatchers?.validate() ?? true;
        if (errors.length === 0 && slotOk) {
            if (val.record.type === "Percentage") val.record.amount = val.record.amount / 100;
            await createDiscount({
                ...val,
                record: {...val.record, ...slotMatchers?.build()},
            });
        }
    }

    let submitting = false;

    async function createDiscount(c: CreateDiscountReq) {
        submitting = true;
        await toResult(() => $api.vDiscountCreate("1.0", c),
            $_('discounts.create.createError', { locale: $lang })).match({
            ok: ok => {
                toast.info($_('discounts.create.createdToast', { locale: $lang, values: { name: ok.record.name } }));
                dialogOpen = false;
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        })
        submitting = false;
    }


</script>

<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger class="w-full max-w-80  {buttonVariants({ variant: 'default' })}">
        {$_('discounts.create.trigger', { locale: $lang })}
    </Dialog.Trigger>
    <Dialog.Content class="max-h-[90vh] overflow-y-auto">
        <Dialog.Header>
            <Dialog.Title>{$_('discounts.create.title', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        {$_('discounts.create.intro', { locale: $lang })}
                    </p>
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title>{$_('discounts.create.takeNote', { locale: $lang })}</Alert.Title>
                        <Alert.Description
                        >{$_('discounts.create.noteBody', { locale: $lang })}
                        </Alert.Description>
                    </Alert.Root>
                    <Validation {errors} {taints} path="record.name">
                        <Input
                                placeholder={$_('fields.name', { locale: $lang })}
                                bind:value={val.record.name}
                                on:input={onChange("record.name")}
                        />
                    </Validation>
                    <Validation {errors} {taints} path="record.description">
                        <Input
                                placeholder={$_('fields.description', { locale: $lang })}
                                bind:value={val.record.description}
                                on:input={onChange("record.description")}
                        />
                    </Validation>
                    <div class="flex justify-between">
                        <Validation {errors} {taints} path="record.amount">
                            <div class="flex items-center gap-2">
                                {#if val.record.type === "Flat"}
                                    <div class=" text-lg text-primary">S$</div>
                                {/if}
                                <Input
                                        class="flex-1"
                                        placeholder={$_('discounts.create.amountPlaceholder', { locale: $lang })}
                                        inputmode="numeric"
                                        bind:value={val.record.amount}
                                        on:input={onChange("record.amount")}
                                />
                                {#if val.record.type === "Percentage"}
                                    <div class=" text-lg text-primary">%</div>
                                {/if}
                            </div>
                        </Validation>
                        <Validation {errors} {taints} path="record.type">

                            <ToggleGroup.Root type="single" bind:value={val.record.type}
                                              onValueChange={onChange("record.type")}>
                                {#each Object.entries(DISCOUNT_TYPE) as [, v]}
                                    <ToggleGroup.Item value={v.value} aria-label={$_('discounts.create.toggle', { locale: $lang, values: { label: $_(`status.discountType.${v.value}`, { locale: $lang }) } })}>
                                        {$_(`status.discountType.${v.value}`, { locale: $lang })}
                                    </ToggleGroup.Item>
                                {/each}
                            </ToggleGroup.Root>
                        </Validation>
                    </div>
                    <Validation {errors} {taints} path="target.matchMode">
                        <div class="flex flex-1 flex-col gap-2 rounded-md border p-3 text-primary sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                {$_('discounts.create.matchType', { locale: $lang })}
                            </div>
                            <ToggleGroup.Root type="single" bind:value={val.target.matchMode} class="flex-wrap justify-start sm:justify-end"
                                              onValueChange={onChange("target.matchMode")}>
                                {#each Object.entries(DISCOUNT_MATCH_MODE) as [, v]}
                                    <ToggleGroup.Item class="min-w-20 px-2 text-xs" value={v.value} aria-label={$_('discounts.create.toggle', { locale: $lang, values: { label: $_(`status.discountMode.${v.value}`, { locale: $lang }) } })}>
                                        {$_(`status.discountMode.${v.value}`, { locale: $lang })}
                                    </ToggleGroup.Item>
                                {/each}
                            </ToggleGroup.Root>

                        </div>
                    </Validation>
                    {#each val.target.matches as match, i}
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Validation {errors} {taints} path="target.matches.{i}.value">
                                <Input
                                        class="w-full sm:w-48"
                                        placeholder={$_('discounts.create.matchTarget', { locale: $lang })}
                                        bind:value={match.value}
                                        on:input={onChange(`target.matches.${i}.value`)}
                                />
                            </Validation>
                            <Validation {errors} {taints} path="target.matches.{i}.matchType">
                                <ToggleGroup.Root type="single" bind:value={match.matchType}
                                                  onValueChange={onChange(`target.matches.${i}.matchType`)}>
                                    {#each Object.entries(DISCOUNT_MATCH_TYPE) as [, v]}
                                        <ToggleGroup.Item class="w-16" value={v.value} aria-label={$_('discounts.create.toggle', { locale: $lang, values: { label: $_(`status.discountMatchType.${v.value}`, { locale: $lang }) } })}>
                                            {$_(`status.discountMatchType.${v.value}`, { locale: $lang })}
                                        </ToggleGroup.Item>
                                    {/each}
                                </ToggleGroup.Root>
                            </Validation>
                            <Button variant="destructive" size="icon" class="h-11 w-11 shrink-0" on:click={deleteTarget(i)}>
                                <LucideTrash2 class="h-4 w-4"/>
                            </Button>
                        </div>
                    {/each}
                    <Button on:click={addTarget} disabled={val.target.matchMode === "None"}>
                        <LucidePlusCircle class="mr-2 h-4 w-4"/>
                        {$_('discounts.create.addMatchTarget', { locale: $lang })}
                    </Button>
                    <hr>
                    <SlotMatchers bind:this={slotMatchers} seed={null} open={dialogOpen}/>
                    <hr>
                    <Button class="my-2" on:click={submit} disabled={submitting}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        {$_('discounts.create.trigger', { locale: $lang })}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
