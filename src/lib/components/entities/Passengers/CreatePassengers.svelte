<script lang="ts">

    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {AlertTriangle, CalendarIcon, LucideLoader, PlusCircle} from "lucide-svelte";
    // @ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    // @ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    // @ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    // @ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import type {CreateDiscountReq, CreatePassengerReq} from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {Input} from "$lib/components/ui/input";
    import Validation from "$lib/components/core/Validation.svelte";
    import {tick} from "svelte";
    import {DateFormatter, type DateValue, getLocalTimeZone} from "@internationalized/date";
    import {addMonths, format} from "date-fns";
    import {cn} from "$lib/utils";
    import AdvanceCalendar from "$lib/components/custom/calendar/AdvanceCalendar.svelte";

    let dialogOpen = false;
    let errors: ZodIssue[] = [];
    let taints: Record<string, boolean> = {}

    const createPassengerSchema = z.object({
        fullName: z.string()
            .min(1, "Full name must be at least 1 character long")
            .max(512, "Full name must be at most 512 characters long")
            .regex(/[a-zA-Z @./',-`*]+/, "Full name must only contain letters and special characters @ . / ' , - ` *"),
        gender: z.enum(['M', 'F']),
        passportNumber: z.string()
            .min(1, "Passport number must be at least 1 character long")
            .max(64, "Passport number must be at most 64 characters long"),
        passportExpiry: z.date()
            .min(addMonths(new Date(), 6), "Passport expiry must at least 6 months from now"),
    }).required();


    type Passenger = z.infer<typeof createPassengerSchema>;

    let val = {
        fullName: "",
        gender: "M",
        passportNumber: "",
        passportExpiry: new Date(),
    }


    const df = new DateFormatter("en-US", {
        dateStyle: "long"
    });

    let bindDate: DateValue | undefined = undefined;

    let submitting = false;

    export let userId: string;

    function onDateChange(v: DateValue) {
        val.passportExpiry = v.toDate(getLocalTimeZone());
        onChange("passportExpiry")()
    }

    const onChange = (path: string) => async () => {
        await tick();
        taints[path] = true;
        const r = createPassengerSchema.safeParse(val);
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
            await createPassenger({
                ...val,
                passportExpiry: format(val.passportExpiry, "dd-MM-yyyy"),
            });

        }
    }


    async function createPassenger(c: CreatePassengerReq) {
        submitting = true;
        await toResult(() => $api.vPassengerCreate(userId, "1.0", c),
            "Failed to create passenger").match({
            ok: ok => {
                toast.info(`Successfully created passenger '${ok.fullName}'`);
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


    $: isValid = errors.length === 0 && Object.entries(taints).length > 0;

</script>

<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger class="w-full max-w-48  {buttonVariants({ variant: 'default' })}">
        <PlusCircle class="mr-2 w-4 h-4"/>
        Create Passenger
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Create a new passenger</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        Create a new Passenger for ease of bookings.
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

                    <Button class="my-2" on:click={submit} disabled={submitting || !isValid}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        Create Passenger
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
