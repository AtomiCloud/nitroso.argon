<script lang="ts">

    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {AlertTriangle, CalendarIcon, Edit2, LucideLoader, PlusCircle} from "lucide-svelte";
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
    import {CalendarDate, DateFormatter, type DateValue, getLocalTimeZone, parseDate} from "@internationalized/date";
    import {addMonths, format, parse} from "date-fns";
    import {cn} from "$lib/utils";
    import AdvanceCalendar from "$lib/components/custom/calendar/AdvanceCalendar.svelte";

    let dialogOpen = false;

    const updatePassengerSchema = z.object({
        fullName: z.string()
            .min(1, "Full name must be at least 1 character long")
            .max(512, "Full name must be at most 512 characters long"),
        gender: z.enum(['M', 'F']),
        passportNumber: z.string()
            .min(1, "Passport number must be at least 1 character long")
            .max(64, "Passport number must be at most 64 characters long"),
        passportExpiry: z.date()
            .min(addMonths(new Date(), 6), "Passport expiry must at least 6 months from now")
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

    const df = new DateFormatter("en-US", {
        dateStyle: "long"
    });

    let bindDate: DateValue = parseDate(format(val.passportExpiry, 'yyyy-MM-dd'))

    let submitting = false;

    function onDateChange(v: DateValue) {
        val.passportExpiry = v.toDate(getLocalTimeZone());
        onChange("passportExpiry")()
    }

    const onChange = (path: string) => async () => {
        await tick();
        taints[path] = true;
        const r = updatePassengerSchema.safeParse(val);
        if (!r.success) {
            const e = r as SafeParseError<CreateDiscountReq>;
            errors = e.error.errors;
        } else {
            errors = [];
        }
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
        await toResult(() => $api.vPassengerUpdate(passenger.id , "1.0", c, {userId}),
            "Failed to update passenger").match({
            ok: ok => {
                toast.info(`Successfully updated passenger '${ok.fullName}'`);
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
            <Dialog.Title>Updating a passenger</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        Updating an existing Passenger.
                    </p>
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title>Take Note!</Alert.Title>
                        <Alert.Description>
                            Please ensure and check the passport details creating.
                            Our system does not have the ability to validate your details.
                            All incorrect tickets purchased with incorrect details will
                            <span class="underline">NOT</span> be refunded.
                        </Alert.Description>
                    </Alert.Root>
                    <Validation {errors} {taints} path="fullName">
                        <Input
                                placeholder="Fullname as per Passport"
                                bind:value={val.fullName}
                                on:input={onChange("fullName")}
                        />
                    </Validation>
                    <Validation {errors} {taints} path="passportNumber">
                        <Input
                                placeholder="Passport Number"
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
                                        {bindDate ? df.format(bindDate.toDate(getLocalTimeZone())) : "Passport Expiry Date"}
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
                                <ToggleGroup.Item value='M' aria-label="Male">M</ToggleGroup.Item>
                                <ToggleGroup.Item value='F' aria-label="Female">F</ToggleGroup.Item>
                            </ToggleGroup.Root>
                        </Validation>
                    </div>

                    <Button class="my-2" on:click={submit} disabled={submitting || errors.length > 0}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        Update Passenger
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
