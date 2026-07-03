<script lang="ts">

    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {AlertTriangle, CalendarIcon, Edit2, LucideLoader} from "lucide-svelte";
    // @ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    // @ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    // @ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    // @ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import type {CreateDiscountReq, PassengerPrincipalRes, UpdatePassengerReq} from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {Input} from "$lib/components/ui/input";
    import Validation from "$lib/components/core/Validation.svelte";
    import {tick} from "svelte";
    import {type DateValue, getLocalTimeZone, parseDate} from "@internationalized/date";
    import {addMonths, format, parse} from "date-fns";
    import {cn} from "$lib/utils";
    import AdvanceCalendar from "$lib/components/custom/calendar/AdvanceCalendar.svelte";
    import {_} from "svelte-i18n";
    import {lang, formatCalendarDate} from "$lib/i18n";

    let dialogOpen = false;

    $: updatePassengerSchema = z.object({
        fullName: z.string()
            .min(1, $_('passengers.create.validation.fullNameMin', { locale: $lang }))
            .max(512, $_('passengers.create.validation.fullNameMax', { locale: $lang }))
            .regex(/^[a-zA-Z @./',\-`*]+$/, $_('passengers.create.validation.fullNameRegex', { locale: $lang })),
        gender: z.enum(['M', 'F']),
        passportNumber: z.string()
            .regex(/^([a-zA-Z0-9]+)$/, $_('passengers.create.validation.passportNumberRegex', { locale: $lang }))
            .min(1, $_('passengers.create.validation.passportNumberMin', { locale: $lang }))
            .max(20, $_('passengers.create.validation.passportNumberMax', { locale: $lang })),
        passportExpiry: z.date()
            .min(addMonths(new Date(), 6), $_('passengers.create.validation.passportExpiryMin', { locale: $lang }))
    }).required();


    export let userId: string | undefined;

    export let passenger: PassengerPrincipalRes;

    function toDate(dd: string) {
        return parse(dd, "dd-MM-yyyy", new Date());
    }

    let val = {
        fullName: passenger.fullName,
        gender: passenger.gender,
        passportNumber: passenger.passportNumber,
        passportExpiry: toDate(passenger.passportExpiry),
    }

    let errors: ZodIssue[] = [];

    let taints: Record<string, boolean> = {}


    let bindDate: DateValue = parseDate(format(val.passportExpiry, 'yyyy-MM-dd'))

    let submitting = false;

    function onDateChange(v: DateValue) {
        val.passportExpiry = v.toDate(getLocalTimeZone());
        onChange("passportExpiry")()
    }

    const onChange = (path: string) => async () => {
        await tick();
        taints[path] = true;
        validate();
    }

    function validate() {
        const r = updatePassengerSchema.safeParse(val);
        if (!r.success) {
            const e = r as SafeParseError<CreateDiscountReq>;
            errors = e.error.errors;
        } else {
            errors = [];
        }
    }

    // Re-run validation whenever the locale-rebuilt schema changes, so an error
    // already on screen re-renders in the new language after a no-reload language
    // switch (AC5). Guarded on taints so it never surfaces errors before the user
    // has interacted.
    $: revalidateOnLocale(updatePassengerSchema);

    function revalidateOnLocale(_schema: typeof updatePassengerSchema) {
        if (Object.keys(taints).length === 0) return;
        validate();
    }


    async function submit() {
        onChange("");
        if (errors.length === 0) {
            await updatePassenger({
                ...val,
                passportExpiry: format(val.passportExpiry, "dd-MM-yyyy"),
            });

        }
    }


    async function updatePassenger(c: UpdatePassengerReq) {
        submitting = true;
        await toResult(() => $api.vPassengerUpdate(passenger.id, "1.0", c, {userId}),
            $_('passengers.update.errorToast', { locale: $lang })).match({
            ok: ok => {
                toast.info($_('passengers.update.successToast', { locale: $lang, values: { name: ok.fullName } }));
                dialogOpen = false;
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        })
        submitting = false;
        val.fullName = "";
        val.gender = "M";
        val.passportNumber = "";
        val.passportExpiry = new Date();
    }


</script>

<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger class="{buttonVariants({ variant: 'ghost', size: 'icon' })}">
        <Edit2 class="w-4 h-4"/>
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>{$_('passengers.update.title', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        {$_('passengers.update.subtitle', { locale: $lang })}
                    </p>
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title>{$_('passengers.alert.takeNote', { locale: $lang })}</Alert.Title>
                        <Alert.Description>
                            {$_('passengers.alert.detailsLead', { locale: $lang })}
                            <span class="underline">{$_('passengers.alert.not', { locale: $lang })}</span> {$_('passengers.alert.refundedTrail', { locale: $lang })}
                        </Alert.Description>
                    </Alert.Root>
                    <Validation {errors} {taints} path="fullName">
                        <Input
                                placeholder={$_('passengers.create.fullNamePlaceholder', { locale: $lang })}
                                bind:value={val.fullName}
                                on:input={onChange("fullName")}
                        />
                    </Validation>
                    <Validation {errors} {taints} path="passportNumber">
                        <Input
                                placeholder={$_('fields.passportNumber', { locale: $lang })}
                                bind:value={val.passportNumber}
                                on:input={onChange("passportNumber")}
                        />
                    </Validation>
                    <div class="flex gap-4 justify-between">
                        <Validation {errors} {taints} path="passportExpiry">

                            <Popover.Root>
                                <Popover.Trigger asChild let:builder>
                                    <Button
                                            variant="outline"
                                            class={cn(
        "w-full justify-start text-center font-normal",!bindDate && "text-muted-foreground")}
                                            builders={[builder]}
                                    >
                                        <CalendarIcon class="mr-2 h-4 w-4"/>
                                        {bindDate ? formatCalendarDate(bindDate.toDate(getLocalTimeZone()), $lang, {dateStyle: "long"}) : $_('passengers.passportExpiryLabel', { locale: $lang })}
                                    </Button>
                                </Popover.Trigger>
                                <Popover.Content class="w-auto p-0" align="start">
                                    <AdvanceCalendar years={50} after={true} bind:value={bindDate}
                                                     onValueChange={onDateChange}/>
                                </Popover.Content>
                            </Popover.Root>
                        </Validation>
                        <Validation {errors} {taints} path="gender">

                            <ToggleGroup.Root type="single" bind:value={val.gender}
                                              onValueChange={onChange("gender")}>
                                <ToggleGroup.Item value='M' aria-label={$_('passengers.gender.male', { locale: $lang })}>M</ToggleGroup.Item>
                                <ToggleGroup.Item value='F' aria-label={$_('passengers.gender.female', { locale: $lang })}>F</ToggleGroup.Item>
                            </ToggleGroup.Root>
                        </Validation>
                    </div>

                    <Button class="my-2" on:click={submit} disabled={submitting || errors.length > 0}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        {$_('passengers.update.submit', { locale: $lang })}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
