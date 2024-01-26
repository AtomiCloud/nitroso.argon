<!--<script lang="ts">-->
<!--    import Page from "$lib/components/complex/page.svelte";-->
<!--    import Loader from "$lib/components/complex/loader.svelte";-->
<!--    import {Input} from "$lib/components/ui/input";-->
<!--    import {page} from "$app/stores";-->

<!--    //@ts-ignore-->
<!--    import * as Select from "$lib/components/ui/select";-->
<!--    //@ts-ignore-->
<!--    import * as Popover from "$lib/components/ui/popover";-->
<!--    //@ts-ignore-->
<!--    import * as ToggleGroup from "$lib/components/ui/toggle-group";-->
<!--    import {CalendarDate, type DateValue, getLocalTimeZone} from "@internationalized/date";-->
<!--    import {CalendarIcon, FilePieChart} from "lucide-svelte";-->
<!--    import {cn} from "$lib/utils";-->
<!--    import {Calendar} from "$lib/components/ui/calendar";-->
<!--    import {Button} from "$lib/components/ui/button";-->
<!--    import {api} from "../../../store";-->
<!--    import {toResult} from "$lib/utility";-->
<!--    import type {BookingPassengerReq, CreateDiscountReq} from "$lib/api/core/data-contracts";-->
<!--    import {toast} from "svelte-sonner";-->
<!--    import {invalidateAll} from "$app/navigation";-->
<!--    import {type SafeParseError, z, type ZodIssue} from "zod";-->
<!--    import {tick} from "svelte";-->


<!--    // Util-->
<!--    function toCalDate(s: string): DateValue | undefined {-->
<!--        if (s == "") return undefined;-->
<!--        const [d, m, y] = s.split("-");-->
<!--        return new CalendarDate(parseInt(y), parseInt(m), parseInt(d));-->
<!--    }-->

<!--    function toZincDate(s?: DateValue): string {-->
<!--        if (s == null) return "";-->
<!--        const [y, m, d] = s.toString().split("-");-->
<!--        return `${d}-${m}-${y}`;-->
<!--    }-->


<!--    let date = $page.url.searchParams.get("date");-->
<!--    let direction = $page.url.searchParams.get("direction");-->
<!--    let time = $page.url.searchParams.get("time");-->
<!--    let userId = $page.url.searchParams.get("userId");-->

<!--    let passenger = {-->
<!--        fullName: "",-->
<!--        gender: "",-->
<!--        passportNumber: "",-->
<!--    }-->

<!--    const passengerSchema = z.object({-->
<!--        fullName: z.string().min(1).max(512),-->
<!--        gender: z.enum(['M', 'F']),-->
<!--        passportNumber: z.string().min(1).max(64),-->
<!--    }).required();-->


<!--    let errors: ZodIssue[] = [];-->

<!--    let taints: Record<string, boolean> = {}-->

<!--    const onChange = (path: string) => async () => {-->
<!--        await tick();-->
<!--        taints[path] = true;-->
<!--        const r = passengerSchema.safeParse(passenger);-->

<!--        if (!r.success) {-->
<!--            const e = r as SafeParseError<CreateDiscountReq>;-->
<!--            errors = e.error.errors;-->
<!--        } else {-->
<!--            errors = [];-->
<!--        }-->
<!--    }-->

<!--    let submitting = false;-->

<!--    async function buy() {-->
<!--        submitting = true;-->
<!--        await toResult(() => $api.vBookingPurchaseCreate(userId, "1", {-->
<!--            date, time, direction, passenger-->
<!--        }), "Failed to purchase booking")-->
<!--            .match({-->
<!--                ok: ok => {-->
<!--                    toast.info(`Successfully booked ticket`);-->
<!--                    invalidateAll();-->
<!--                },-->
<!--                err: (e) => {-->
<!--                    console.error(e);-->
<!--                    toast.error(e.detail ?? e.type);-->
<!--                }-->
<!--            });-->
<!--        submitting = false;-->
<!--    }-->


<!--</script>-->

<!--<div class="flex flex-col">-->
<!--    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">-->

<!--        {#if $page.data.session?.roles?.includes("admin")}-->
<!--            <Input class="w-full"-->
<!--                   placeholder="Filter by user ID..." bind:value={userId} on:input={triggerSearch}/>-->
<!--        {/if}-->
<!--        <div class="flex gap-4 flex-wrap justify-between">-->
<!--            <Popover.Root>-->
<!--                <Popover.Trigger asChild let:builder>-->
<!--                    <Button variant="outline"-->
<!--                            class={cn("w-full max-w-sm lg:max-w-[240px] justify-start text-left font-normal",!bindDate && "text-muted-foreground")}-->
<!--                            builders={[builder]}>-->
<!--                        <CalendarIcon class="mr-2 h-4 w-4"/>-->
<!--                        {bindDate ? df.format(bindDate.toDate(getLocalTimeZone())) : "Select a date"}-->
<!--                    </Button>-->
<!--                </Popover.Trigger>-->
<!--                <Popover.Content class="w-auto p-0" align="start">-->
<!--                    <Calendar bind:value={bindDate} onValueChange={dateChange}/>-->
<!--                </Popover.Content>-->
<!--            </Popover.Root>-->
<!--            <Select.Root bind:selected={bookingStatus} onSelectedChange={bookingStatusChange}>-->
<!--                <Select.Trigger class="w-full lg:max-w-60">-->
<!--                    <FilePieChart class="mr-2 h-4 w-4"/>-->
<!--                    <Select.Value placeholder="Status"/>-->
<!--                </Select.Trigger>-->
<!--                <Select.Content>-->
<!--                    <Select.Item value="">None</Select.Item>-->
<!--                    {#each Object.entries(BOOKING_STATUS) as [, val]}-->
<!--                        <Select.Item value={val.value}>{val.label}</Select.Item>-->
<!--                    {/each}-->
<!--                </Select.Content>-->
<!--            </Select.Root>-->
<!--            <ToggleGroup.Root type="single" bind:value={bindDirection} class="w-full max-w-sm lg:max-w-[240px]"-->
<!--                              onValueChange={directionChange}>-->
<!--                <ToggleGroup.Item value="WToJ" aria-label="Woodlands to JB Sentral">-->
<!--                    Woodlands to JB-->
<!--                </ToggleGroup.Item>-->
<!--                <ToggleGroup.Item value="JToW" aria-label="JB Sentral to Woodlands">-->
<!--                    JB to Woodlands-->
<!--                </ToggleGroup.Item>-->
<!--            </ToggleGroup.Root>-->
<!--        </div>-->

<!--        {#await bookings}-->
<!--            <Loader/>-->
<!--        {:then bs}-->
<!--            <Page notFoundMessage="Not bookings found" empty={bs.length === 0}>-->


<!--                {#each bs as b}-->
<!--                    {JSON.stringify(b)}-->


<!--                {/each}-->
<!--            </Page>-->
<!--        {/await}-->
<!--    </div>-->
<!--</div>-->
