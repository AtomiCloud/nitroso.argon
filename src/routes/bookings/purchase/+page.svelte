<script lang="ts">
    import {page} from "$app/stores";

    //@ts-ignore
    import * as Select from "$lib/components/ui/select";
    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    //@ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import {problem} from "../../../store";
    import type {CreateDiscountReq, MaterializedCostRes, PassengerPrincipalRes} from "$lib/api/core/data-contracts";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import {tick} from "svelte";
    import {addMonths, format, parse} from "date-fns";
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
    import {Separator} from "$lib/components/ui/separator";
    import PurchaseBooking from "$lib/components/entities/Bookings/PurchaseBooking.svelte";

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
        return parse(date, "dd-MM-yyyy", new Date());
    }

    function toDisplayDate(date: string) {
        return format(toNativeDate(date), "dd MMM yyyy");
    }

    const df = new DateFormatter("en-US", {
        dateStyle: "medium"
    });

    let date = $page.url.searchParams.get("date");
    let direction = $page.url.searchParams.get("direction");
    let time = $page.url.searchParams.get("time");
    let userId = $page.url.searchParams.get("userId");

    $: passengerAndCost = (Res.fromSerial<[PassengerPrincipalRes[], MaterializedCostRes], ProblemDetails[]>(data.result)
        .match({
            ok: (a: [PassengerPrincipalRes[], MaterializedCostRes]): [PassengerPrincipalRes[], MaterializedCostRes] => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e[0]);
                return null as never;
            }
        }) satisfies Promise<[PassengerPrincipalRes[], MaterializedCostRes]>)

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

    let checked = false;

    function allowSavePassenger(ps: PassengerPrincipalRes[], p: { passportNumber: string }) {
        return ps.every(x => x.passportNumber !== p.passportNumber);
    }

    $: displayDate = toDisplayDate(date);
    $: displayTime = new Date(`1970-01-01T${time}`).toLocaleTimeString(undefined, {
        hourCycle: "h12",
        timeStyle: "short",
    });
    $: displayDirection = direction === "JToW" ? "JB Sentral to Woodlands" : "Woodlands to JB Sental";
</script>

<div class="flex flex-col">
    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">
        <div class="flex flex-col gap-4 mb-12">
            <h1 class="text-2xl text-center md:text-start">Purchase Booking</h1>
            <div class="flex gap-4 items-center flex-wrap justify-center md:justify-start">
                <h2 class="text-md text-muted-foreground">{displayDate}</h2>
                <h2 class="text-md text-muted-foreground">{displayTime}</h2>
                <Badge>  {displayDirection}</Badge>
            </div>
        </div>

        {#await passengerAndCost then [ps, cost]}
            {#if ps.length > 0}
                <div class="flex flex-col gap-1.5 my-4">
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
                </div>
            {/if}

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
                <div class="flex gap-2 justify-between">
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
                                    {bindDate ? df.format(bindDate.toDate(getLocalTimeZone())) : "Passport Expiry"}
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
                {#if allowSavePassenger(ps, passenger)}
                    <div class="flex items-center space-x-2">
                        <Checkbox id="terms" bind:checked/>
                        <Label
                                for="terms"
                                class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Save this passenger
                        </Label>
                    </div>
                {/if}
                <Separator class="my-8"/>
                <div class="flex justify-between items-center">
                    <div class="font-bold text-lg">Booking Cost</div>
                    <div class="font-bold text-lg">
                        S${cost.cost.toFixed(2)}
                    </div>
                </div>
                <Separator class="my-2"/>
                {#each cost.discounts as d}
                    <div class="flex justify-between items-center my-2">
                        <div class="flex flex-col">
                            <div class="font-semibold">{d.name}</div>
                            <div class="text-xs font-light">{d.description}</div>
                        </div>
                        <div class="font-light text-lg">
                            {#if d.type === "Flat"}
                                -S${d.amount.toFixed(2)}
                            {:else}
                                -{d.amount * 100}%
                            {/if}
                        </div>
                    </div>
                {/each}
                {#if cost.discounts.length > 0 }
                    <Separator class="my-4"/>
                {/if}
                <div class="flex justify-end items-center">
                    <div class="font-bold text-lg">
                        S${cost.final.toFixed(2)}
                    </div>
                </div>
                <div class="my-6 w-full flex justify-between ">
                    <div class="flex flex-col gap-2">
                        <PurchaseBooking
                                {errors}
                                {taints}
                                {checked} {passenger} {direction} {userId} {date} {time}
                                wallet={$page.data.user?.wallet?.usable ?? 0}
                                cost={cost.final}
                        />
                        <div class="{($page.data.user?.wallet?.usable ?? 0) >= cost.final ? 'opacity-0': '' } text-left">
                            <div class="text-sm text-red-500">Insufficient balance</div>
                        </div>
                    </div>

                    <div class="flex flex-col items-center">
                        <div class="text-lg font-semibold">
                            S$ {$page.data.user?.wallet?.usable?.toFixed(2) ?? "0.00"}</div>
                        <div class="text-sm font-light">Your Balance</div>
                        <div class="text-sm font-light {($page.data.user?.wallet?.usable ?? 0) >= cost.final ? 'hidden': '' }">
                            <a class="underline text-blue-500 hover:text-sky-500" href="/wallets/deposit">Deposit
                                Now</a>
                        </div>
                    </div>
                </div>

            </div>
        {/await}
    </div>
</div>
