<script lang="ts">

    import {Button, buttonVariants} from "$lib/components/ui/button/index.js";
    import {AlertTriangle, LucideEdit, LucideLoader, LucidePlusCircle, LucideTrash2} from "lucide-svelte";

    // @ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    // @ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import type {CreateDiscountReq, DiscountPrincipalRes, UpdateDiscountReq} from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import {api} from "../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    // @ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import {Input} from "$lib/components/ui/input";
    import Validation from "$lib/components/core/Validation.svelte";
    import {DISCOUNT_MATCH_MODE, DISCOUNT_MATCH_TYPE, DISCOUNT_TYPE} from "../../../routes/discounts/status";
    import {tick} from "svelte";

    let dialogOpen = false;

    const updateDiscountSchema = z.object({
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

    export let discount: DiscountPrincipalRes;
    const val: UpdateDiscountReq = {
        target: {
            ...discount.target
        },
        record: {
            ...discount.record
        },
        status: {
            ...discount.status
        }
    }

    let errors: ZodIssue[] = [];

    let taints: Record<string, boolean> = {}

    const onChange = (path: string) => async () => {
        await tick();
        taints[path] = true;
        const r = updateDiscountSchema.safeParse(val);

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
        if (errors.length === 0) await updateDiscount(val);
    }

    let submitting = false;

    async function updateDiscount(c: UpdateDiscountReq) {
        submitting = true;
        await toResult(() => $api.vDiscountUpdate(discount.id, "1.0", c),
            "Failed to update discount").match({
            ok: ok => {
                toast.info(`Successfully updated discount '${ok.record.name}'`);
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
    <Dialog.Trigger class="{buttonVariants({ variant: 'ghost', size: 'icon' })}">
        <LucideEdit class="h-4 w-4"/>
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Editing a new discount</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        Edit an existing Discount that applies to members who meet a certain condition.
                    </p>
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title>Take Note!</Alert.Title>
                        <Alert.Description
                        >Discounts are effective the moment they are updated. You can disable them at any time.
                        </Alert.Description>
                    </Alert.Root>
                    <Validation {errors} {taints} path="record.name">
                        <Input
                                placeholder="Name"
                                bind:value={val.record.name}
                                on:input={onChange("record.name")}
                        />
                    </Validation>
                    <Validation {errors} {taints} path="record.description">
                        <Input
                                placeholder="Description"
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
                                        placeholder="Discount Amount"
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
                                    <ToggleGroup.Item value={v.value} aria-label="Toggle {v.label}">
                                        {v.label}
                                    </ToggleGroup.Item>
                                {/each}
                            </ToggleGroup.Root>
                        </Validation>
                    </div>
                    <Validation {errors} {taints} path="target.matchMode">
                        <div class="flex flex-1 justify-between items-center text-primary border pl-4 rounded-md">
                            <div>
                                Match Type
                            </div>
                            <ToggleGroup.Root type="single" bind:value={val.target.matchMode}
                                              onValueChange={onChange("target.matchMode")}>
                                {#each Object.entries(DISCOUNT_MATCH_MODE) as [, v]}
                                    <ToggleGroup.Item class="w-16" value={v.value} aria-label="Toggle {v.label}">
                                        {v.label}
                                    </ToggleGroup.Item>
                                {/each}
                            </ToggleGroup.Root>

                        </div>
                    </Validation>
                    {#each val.target.matches as match, i}
                        <div class="flex justify-between gap-2">
                            <Validation {errors} {taints} path="target.matches.{i}.value">
                                <Input
                                        class="w-48"
                                        placeholder="Match Target"
                                        bind:value={match.value}
                                        on:input={onChange(`target.matches.${i}.value`)}
                                />
                            </Validation>
                            <Validation {errors} {taints} path="target.matches.{i}.matchType">
                                <ToggleGroup.Root type="single" bind:value={match.matchType}
                                                  onValueChange={onChange(`target.matches.${i}.matchType`)}>
                                    {#each Object.entries(DISCOUNT_MATCH_TYPE) as [, v]}
                                        <ToggleGroup.Item class="w-16" value={v.value} aria-label="Toggle {v.label}">
                                            {v.label}
                                        </ToggleGroup.Item>
                                    {/each}
                                </ToggleGroup.Root>
                            </Validation>
                            <Button variant="destructive" size="icon" on:click={deleteTarget(i)}>
                                <LucideTrash2 class="h-4 w-4"/>
                            </Button>
                        </div>
                    {/each}
                    <Button on:click={addTarget} disabled={val.target.matchMode === "None"}>
                        <LucidePlusCircle class="mr-2 h-4 w-4"/>
                        Add Match Target
                    </Button>
                    <hr>
                    <Button class="my-2" on:click={submit} disabled={submitting}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin" />
                        {/if}
                        Update Discount
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
