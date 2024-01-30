<script lang="ts">
    import {page} from "$app/stores";

    //@ts-ignore
    import * as Select from "$lib/components/ui/select";
    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    //@ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import {api, problem} from "../../../store";
    import {toResult} from "$lib/utility";
    import type {CreateDiscountReq, PassengerPrincipalRes} from "$lib/api/core/data-contracts";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import {tick} from "svelte";
    import {addMonths, format} from "date-fns";
    import {Badge} from "$lib/components/ui/badge";
    import Validation from "$lib/components/core/Validation.svelte";
    import {cn} from "$lib/utils";
    import {DateFormatter, type DateValue, getLocalTimeZone, parseDate} from "@internationalized/date";
    import AdvanceCalendar from "$lib/components/custom/calendar/AdvanceCalendar.svelte";
    import {ArrowLeftRight, CalendarIcon} from "lucide-svelte";
    import {Button} from "$lib/components/ui/button";
    import {Input} from "$lib/components/ui/input";
    import {Res} from "$lib/core/result";
    import type {ProblemDetails} from "../../../errors/problem_details";
    import type {PageData} from "./$types";
    import type {Selected} from "bits-ui";
    import {Checkbox} from "$lib/components/ui/checkbox";
    import {Label} from "$lib/components/ui/label";

    export let data: PageData;

    const emptyPassenger: PassengerPrincipalRes = {
        id: "",
        fullName: "",
        gender: "",
        passportExpiry: format(new Date(), "dd-MM-yyyy"),
        passportNumber: "",
    }

    // Util
    function toNativeDate(date: string) {
        const [d, m, y] = date.split("-").map(x => parseInt(x));
        return new Date(`${y}-${m}-${d}`);
    }

    function toDisplayDate(date: string) {
        return format(toNativeDate(date), "dd MMM yyyy");
    }

    const df = new DateFormatter("en-US", {
        dateStyle: "long"
    });

    let date = $page.url.searchParams.get("date");
    let direction = $page.url.searchParams.get("direction");
    let time = $page.url.searchParams.get("time");
    let userId = $page.url.searchParams.get("userId");

    $: passengers = (Res.fromSerial<PassengerPrincipalRes[], ProblemDetails>(data.result)
        .match({
            ok: (a: PassengerPrincipalRes[]): PassengerPrincipalRes[] => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e);
                return null as never;
            }
        }) satisfies Promise<PassengerPrincipalRes[]>)

    let passenger = {
        fullName: "",
        gender: "",
        passportNumber: "",
        passportExpiry: new Date(),
    }

    const passengerSchema = z.object({
        fullName: z.string()
            .min(1, "Full name must be at least 1 character long")
            .max(512, "Full name must be at most 512 characters long"),
        gender: z.enum(['M', 'F']),
        passportNumber: z.string()
            .min(1, "Passport number must be at least 1 character long")
            .max(64, "Passport number must be at most 64 characters long"),
        passportExpiry: z.date()
            .min(addMonths(toNativeDate(date), 6), "Passport expiry must at least 6 months from ticket date")
    }).required();

    let bindDate: DateValue | undefined = undefined;

    function onDateChange(v: DateValue) {
        passenger.passportExpiry = v.toDate(getLocalTimeZone());
        onChange("passportExpiry")()
    }

    let errors: ZodIssue[] = [];

    let taints: Record<string, boolean> = {}

    const onChange = (path: string) => async () => {
        await tick();
        taints[path] = true;
        const r = passengerSchema.safeParse(passenger);

        if (!r.success) {
            const e = r as SafeParseError<CreateDiscountReq>;
            errors = e.error.errors;
        } else {
            errors = [];
        }
    }

    let submitting = false;

    function passengerChange(s: Selected<PassengerPrincipalRes>) {


        passenger.passportExpiry = toNativeDate(s.value.passportExpiry);
        bindDate = parseDate(format(passenger.passportExpiry, "yyyy-MM-dd"));
        passenger.passportNumber = s.value.passportNumber;
        passenger.fullName = s.value.fullName;
        passenger.gender = s.value.gender;
        onChange("passportExpiry")()
        onChange("passportNumber")()
        onChange("fullName")()
        onChange("gender")()

        checked = false;

    }

    async function reset() {
        passenger = {
            fullName: "",
            gender: "",
            passportNumber: "",
            passportExpiry: new Date(),
        };
        taints = {};
    }

    async function buy() {
        submitting = true;

        if (checked) {
            await toResult(() => $api.vPassengerCreate(userId, "1.0", {
                fullName: passenger.fullName,
                passportExpiry: format(passenger.passportExpiry, "dd-MM-yyyy"),
                gender: passenger.gender,
                passportNumber: passenger.passportNumber,
            }), "Failed to create passenger")
                .andThen(() => toResult(() => $api.vBookingPurchaseCreate(userId, "1", {
                    date, time, direction, passenger: {
                        ...passenger,
                        passportExpiry: format(passenger.passportExpiry, "dd-MM-yyyy"),
                    }
                }), "Failed to purchase booking"))
                .match({
                    ok: ok => {
                        toast.info(`Successfully purchased booking`);
                        invalidateAll();
                        reset();
                    },
                    err: (e) => {
                        console.error(e);
                        toast.error(e.detail ?? e.type);
                    }
                });
        } else {
            await toResult(() => $api.vBookingPurchaseCreate(userId, "1", {
                date, time, direction, passenger: {
                    ...passenger,
                    passportExpiry: format(passenger.passportExpiry, "dd-MM-yyyy"),
                }
            }), "Failed to purchase booking")
                .match({
                    ok: ok => {
                        toast.info(`Successfully purchased booking`);
                        invalidateAll();
                        reset();
                    },
                    err: (e) => {
                        console.error(e);
                        toast.error(e.detail ?? e.type);
                    }
                });
        }

        submitting = false;
    }

    let checked = false;

    $: displayDate = toDisplayDate(date);
    $: displayTime = new Date(`1970-01-01T${time}`).toLocaleTimeString(undefined, {
        hourCycle: "h12",
        timeStyle: "short",
    });
    $: displayDirection = direction === "JToW" ? "JB Sentral to Woodlands" : "Woodlands to JB Sental";
</script>

<div class="flex flex-col">
    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">
        <div class="flex flex-col gap-4">
            <h1 class="text-4xl">Buying Tickets</h1>
            <div class="flex gap-4 items-center">
                <h2 class="text-md text-muted-foreground">{displayDate}</h2>
                <h2 class="text-md text-muted-foreground">{displayTime}</h2>
                <Badge>  {displayDirection}</Badge>
            </div>
        </div>
        <div class="flex flex-col gap-1.5 my-4">
            {#await passengers then ps}
                <h1 class="my-4 text-lg">Select Existing Passenger</h1>
                <Select.Root onSelectedChange={passengerChange}>
                    <Select.Trigger class="w-full lg:max-w-60">
                        <ArrowLeftRight class="mr-2 h-4 w-4"/>
                        <Select.Value placeholder="Passenger"/>
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Item value={emptyPassenger}>None</Select.Item>
                        {#each ps as p}
                            <Select.Item value={p}>{p.fullName}</Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
            {/await}
        </div>

        <div class="flex flex-col gap-1.5">
            <h1 class="my-4 text-lg">Passenger Details</h1>
            <Validation {errors} {taints} path="fullName">
                <Input
                        placeholder="Fullname as per Passport"
                        bind:value={passenger.fullName}
                        on:input={onChange("fullName")}
                />
            </Validation>
            <Validation {errors} {taints} path="passportNumber">
                <Input
                        placeholder="Passport Number"
                        bind:value={passenger.passportNumber}
                        on:input={onChange("passportNumber")}
                />
            </Validation>
            <div class="flex gap-4 justify-between">
                <Validation classNames="flex-1" {errors} {taints} path="passportExpiry">

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
                    <ToggleGroup.Root type="single" bind:value={passenger.gender}
                                      onValueChange={onChange("gender")}>
                        <ToggleGroup.Item value='M' aria-label="Male">M</ToggleGroup.Item>
                        <ToggleGroup.Item value='F' aria-label="Female">F</ToggleGroup.Item>
                    </ToggleGroup.Root>
                </Validation>
            </div>
            <div class="flex items-center space-x-2">
                <Checkbox id="terms" bind:checked/>
                <Label
                        for="terms"
                        class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Save this passenger
                </Label>
            </div>
            <div class="my-6 w-full flex">
                <Button on:click={buy}>Purchase Booking</Button>
            </div>
        </div>
    </div>
</div>
