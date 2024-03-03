<script lang="ts">

    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {AlertTriangle, LucideLoader, ShoppingBasket} from "lucide-svelte";

    // @ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    // @ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {goto} from "$app/navigation";
    import {format, parse} from "date-fns";
    import type {ZodIssue} from "zod";


    export let checked: boolean;
    export let passenger: {
        fullName: string
        gender: string
        passportNumber: string
        passportExpiry: Date
    };

    export let userId: string;

    export let date: string;

    export let time: string;

    export let direction: string;

    export let taints: Record<string, boolean>;

    export let errors: ZodIssue[];

    export let wallet: number;
    export let cost: number;

    let dialogOpen = false;

    let submitting = false;

    function redirectSuccess() {
        goto(`/bookings/purchase/success?date=${date}&time=${time}&direction=${direction}&userId=${userId}&name=${passenger.fullName}&passport=${passenger.passportNumber}`);
    }


    $: isValid = errors.length === 0 && Object.entries(taints).length > 0 && wallet >= cost;

    function toNativeDate(date: string) {
        return parse(date, "dd-MM-yyyy", new Date());
    }

    function toDisplayDate(date: string) {
        return format(toNativeDate(date), "dd MMM yyyy");
    }

    function displayTime(time: string): string {
        return new Date(`1970-01-01T${time}`).toLocaleTimeString(undefined, {
            hourCycle: "h12",
            timeStyle: "short",
        });

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
                        redirectSuccess();
                    },
                    err: (e) => {
                        console.error(e);
                        toast.error(e.detail ?? e.type);
                        dialogOpen = false;
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
                        redirectSuccess();
                    },
                    err: (e) => {
                        console.error(e);
                        toast.error(e.detail ?? e.type);
                        dialogOpen = false;
                    }
                });
        }

        submitting = false;
    }


</script>

<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger class="{buttonVariants({ variant: 'default' })}" disabled={!isValid}>
        <ShoppingBasket class="mr-2 h-4 w-4"/>
        Purchase
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Purchase Booking</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        Purchase booking request for train ticket on <code
                            class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                        {toDisplayDate(date)}, {displayTime(time)}
                    </code> from <code
                            class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                        {direction === "JToW" ? "Johor to Woodlands" : "Woodlands to Johor"}
                    </code>.

                    </p>
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title> Important</Alert.Title>
                        <Alert.Description>
                            BunnyBooker is not responsible if you enter incorrect information. Please
                            check your information (below) before proceeding to your purchase.
                        </Alert.Description>
                    </Alert.Root>


                    <div class="my-8">
                        <div class="flex justify-between">
                            <div class="font-bold">Full Name</div>
                            <div>{passenger.fullName}</div>
                        </div>
                        <div class="flex justify-between">
                            <div class="font-bold">Passport Expiry</div>
                            <div>{format(new Date(passenger.passportExpiry), "do MMM yyyy")}</div>
                        </div>

                        <div class="flex justify-between">
                            <div class="font-bold">Passport Number</div>
                            <div>{passenger.passportNumber}</div>
                        </div>

                        <div class="flex justify-between">
                            <div class="font-bold">Gender</div>
                            <div>{passenger.gender === "M" ? "Male" : "Female"}</div>
                        </div>
                    </div>

                    <Button class="my-2" on:click={buy} disabled={submitting || !isValid}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        Purchase
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
