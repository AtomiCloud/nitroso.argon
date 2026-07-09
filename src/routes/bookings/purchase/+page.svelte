<script lang="ts">
    import {page} from "$app/stores";

    //@ts-ignore
    import * as Select from "$lib/components/ui/select";
    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    //@ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import {problem} from "../../../store";
    import type {CostSummaryRes, CreateDiscountReq, PassengerPrincipalRes} from "$lib/api/core/data-contracts";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import {tick} from "svelte";
    import {addMonths, format, parse} from "date-fns";
    import {Badge} from "$lib/components/ui/badge";
    import Validation from "$lib/components/core/Validation.svelte";
    import {cn} from "$lib/utils";
    import {type DateValue, getLocalTimeZone, parseDate} from "@internationalized/date";
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
    import {Switch} from "$lib/components/ui/switch";
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    import {Zap} from "lucide-svelte";
    import PurchaseBooking from "$lib/components/entities/Bookings/PurchaseBooking.svelte";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatNumber, formatClockTime, formatCalendarDate} from "$lib/i18n";

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

    let date = $page.url.searchParams.get("date");
    let direction = $page.url.searchParams.get("direction");
    let time = $page.url.searchParams.get("time");
    let userId = $page.url.searchParams.get("userId");

    $: passengerAndCost = (Res.fromSerial<[PassengerPrincipalRes[], CostSummaryRes], ProblemDetails[]>(data.result)
        .match({
            ok: (a: [PassengerPrincipalRes[], CostSummaryRes]): [PassengerPrincipalRes[], CostSummaryRes] => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e[0]);
                return null as never;
            }
        }) satisfies Promise<[PassengerPrincipalRes[], CostSummaryRes]>)

    // ---- priority queue opt-in (only offered when zinc says we're eligible) ----
    $: eligibility = data.eligibility;
    let priorityOptIn = false;
    // gate the purchase on covering the priority fee too, so the follow-up
    // prioritize call can never fail on balance right after a purchase
    $: priorityFee = priorityOptIn && eligibility.eligible ? eligibility.fee : 0;

    function signedDelta(delta: number): string {
        const sign = delta >= 0 ? "+" : "−";
        return `${sign}${formatMoney(Math.abs(delta), $lang)}`;
    }

    let passenger = {
        fullName: "",
        gender: "",
        passportNumber: "",
        passportExpiry: new Date(),
    }

    $: passengerSchema = z.object({
        fullName: z.string()
            .min(1, $_('bookings.purchase.fullNameMin', { locale: $lang }))
            .max(512, $_('bookings.purchase.fullNameMax', { locale: $lang }))
            .regex(/^[a-zA-Z @./',\-`*]+$/, $_('bookings.purchase.fullNameRegex', { locale: $lang })),
        gender: z.enum(['M', 'F']),
        passportNumber: z.string()
            .regex(/^([a-zA-Z0-9]+)$/, $_('bookings.purchase.passportNumberRegex', { locale: $lang }))
            .min(1, $_('bookings.purchase.passportNumberMin', { locale: $lang }))
            .max(20, $_('bookings.purchase.passportNumberMax', { locale: $lang })),
        passportExpiry: z.date()
            .min(addMonths(toNativeDate(date), 6), $_('bookings.purchase.passportExpiryMin', { locale: $lang }))
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
        validate();
    }

    function validate() {
        const r = passengerSchema.safeParse(passenger);

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
    $: revalidateOnLocale(passengerSchema);

    function revalidateOnLocale(_schema: typeof passengerSchema) {
        if (Object.keys(taints).length === 0) return;
        validate();
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

    $: displayDate = formatCalendarDate(toNativeDate(date), $lang);
    $: displayTime = formatClockTime(time, $lang);
    $: displayDirection = direction === "JToW"
        ? $_('bookings.purchase.directionJToW', { locale: $lang })
        : $_('bookings.purchase.directionWToJ', { locale: $lang });
</script>

<div class="flex flex-col">
    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">
        <div class="flex flex-col gap-4 mb-12">
            <h1 class="text-2xl text-center md:text-start">{$_('bookings.purchase.title', { locale: $lang })}</h1>
            <div class="flex gap-4 items-center flex-wrap justify-center md:justify-start">
                <h2 class="text-md text-muted-foreground">{displayDate}</h2>
                <h2 class="text-md text-muted-foreground">{displayTime}</h2>
                <Badge>  {displayDirection}</Badge>
            </div>
        </div>

        {#await passengerAndCost then [ps, cost]}
            {#if ps.length > 0}
                <div class="flex flex-col gap-1.5 my-4">
                    <h1 class="my-4 text-lg">{$_('bookings.purchase.selectExistingPassenger', { locale: $lang })}</h1>
                    <Select.Root onSelectedChange={passengerChange}>
                        <Select.Trigger class="w-full lg:max-w-60">
                            <ArrowLeftRight class="mr-2 h-4 w-4"/>
                            <Select.Value placeholder={$_('bookings.purchase.passenger', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value={emptyPassenger}>{$_('bookings.purchase.none', { locale: $lang })}</Select.Item>
                            {#each ps as p}
                                <Select.Item value={p}>{p.fullName}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>
            {/if}

            <div class="flex flex-col gap-1.5">
                <h1 class="my-4 text-lg">{$_('bookings.purchase.passengerDetails', { locale: $lang })}</h1>
                <Validation {errors} {taints} path="fullName">
                    <Input
                            placeholder={$_('bookings.purchase.fullNamePlaceholder', { locale: $lang })}
                            bind:value={passenger.fullName}
                            on:input={onChange("fullName")}
                    />
                </Validation>
                <Validation {errors} {taints} path="passportNumber">
                    <Input
                            placeholder={$_('bookings.purchase.passportNumberPlaceholder', { locale: $lang })}
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
                                    {bindDate ? formatCalendarDate(bindDate.toDate(getLocalTimeZone()), $lang) : $_('bookings.purchase.passportExpiry', { locale: $lang })}
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
                            <ToggleGroup.Item value='M' aria-label={$_('bookings.purchase.male', { locale: $lang })}>M</ToggleGroup.Item>
                            <ToggleGroup.Item value='F' aria-label={$_('bookings.purchase.female', { locale: $lang })}>F</ToggleGroup.Item>
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
                            {$_('bookings.purchase.savePassenger', { locale: $lang })}
                        </Label>
                    </div>
                {/if}
                <Separator class="my-8"/>
                <!-- itemized breakdown from GET Cost/summary for THIS booking
                     spec — shown price always matches the charged price -->
                <div class="flex justify-between items-center">
                    <div class="font-bold text-lg">{$_('bookings.purchase.bookingCost', { locale: $lang })}</div>
                    <div class="font-bold text-lg">
                        {formatMoney(cost.baseCost, $lang)}
                    </div>
                </div>
                {#each cost.policyLines ?? [] as line}
                    <div class="flex justify-between items-center my-1 text-sm">
                        <div class="font-light">{line.name}</div>
                        <div class="font-light">{signedDelta(line.delta)}</div>
                    </div>
                {/each}
                {#if (cost.policyLines ?? []).length > 0}
                    <Separator class="my-2"/>
                    <div class="flex justify-between items-center">
                        <div class="font-semibold">{$_('bookings.purchase.subtotal', { locale: $lang })}</div>
                        <div class="font-semibold">{formatMoney(cost.subtotal, $lang)}</div>
                    </div>
                {/if}
                <Separator class="my-2"/>
                {#each cost.discounts ?? [] as d}
                    <div class="flex justify-between items-center my-2">
                        <div class="flex flex-col">
                            <div class="font-semibold">{d.name}</div>
                            <div class="text-xs font-light">{d.description}</div>
                        </div>
                        <div class="font-light text-lg">
                            {#if d.type === "Flat"}
                                -{formatMoney(d.amount, $lang)}
                            {:else}
                                -{formatNumber(d.amount * 100, $lang)}%
                            {/if}
                        </div>
                    </div>
                {/each}
                {#if (cost.discounts ?? []).length > 0 }
                    <Separator class="my-4"/>
                {/if}
                <div class="flex justify-end items-center">
                    <div class="font-bold text-lg">
                        {formatMoney(cost.final, $lang)}
                    </div>
                </div>

                {#if eligibility.eligible}
                    <!-- priority queue opt-in -->
                    <Card.Root class="my-4">
                        <Card.Content class="pt-6">
                            <div class="flex items-center justify-between gap-4">
                                <div class="flex items-start gap-3">
                                    <Zap class="h-5 w-5 mt-0.5 text-amber-500 shrink-0"/>
                                    <div class="flex flex-col gap-1">
                                        <div class="font-semibold">{$_('bookings.purchase.priorityTitle', { locale: $lang })}</div>
                                        <div class="text-sm text-muted-foreground">
                                            {$_('bookings.purchase.priorityBody', { locale: $lang, values: { fee: formatMoney(eligibility.fee, $lang) } })}
                                        </div>
                                    </div>
                                </div>
                                <Switch bind:checked={priorityOptIn}
                                        aria-label={$_('bookings.purchase.priorityTitle', { locale: $lang })}/>
                            </div>
                            {#if priorityOptIn}
                                <div class="flex justify-between items-center mt-4 text-sm">
                                    <div>{$_('bookings.purchase.priorityLine', { locale: $lang })}</div>
                                    <div>+{formatMoney(eligibility.fee, $lang)}</div>
                                </div>
                                <div class="flex justify-between items-center mt-1 font-semibold">
                                    <div>{$_('bookings.purchase.totalWithPriority', { locale: $lang })}</div>
                                    <div>{formatMoney(cost.final + eligibility.fee, $lang)}</div>
                                </div>
                            {/if}
                        </Card.Content>
                    </Card.Root>
                {/if}

                <div class="my-6 w-full flex justify-between ">
                    <div class="flex flex-col gap-2">
                        <PurchaseBooking
                                {errors}
                                {taints}
                                {checked} {passenger} {direction} {userId} {date} {time}
                                wallet={$page.data.user?.wallet?.usable ?? 0}
                                cost={cost.final}
                                priority={priorityOptIn && eligibility.eligible}
                                priorityFee={priorityFee}
                        />
                        <div class="{($page.data.user?.wallet?.usable ?? 0) >= cost.final + priorityFee ? 'opacity-0': '' } text-left">
                            <div class="text-sm text-red-500">{$_('bookings.purchase.insufficientBalance', { locale: $lang })}</div>
                        </div>
                    </div>

                    <div class="flex flex-col items-center">
                        <div class="text-lg font-semibold">
                            {formatMoney($page.data.user?.wallet?.usable ?? 0, $lang)}</div>
                        <div class="text-sm font-light">{$_('bookings.purchase.yourBalance', { locale: $lang })}</div>
                        <div class="text-sm font-light {($page.data.user?.wallet?.usable ?? 0) >= cost.final + priorityFee ? 'hidden': '' }">

                            <a id="deposit-link" class="underline text-blue-500 hover:text-sky-500"
                               href="/wallets/deposit">{$_('bookings.purchase.depositNow', { locale: $lang })}</a>
                            <script>
                                window.addEventListener('load', (event) => {
                                    document.getElementById('deposit-link').addEventListener('click', () => {
                                        window?.fathom?.trackEvent('Deposit');
                                    });
                                });
                            </script>
                        </div>
                    </div>
                </div>

            </div>
        {/await}
    </div>
</div>
