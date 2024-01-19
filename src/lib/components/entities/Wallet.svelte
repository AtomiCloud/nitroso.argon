<script lang="ts">
    import {buttonVariants} from "$lib/components/ui/button/index.js";
    import type {UserPrincipalRes, WalletPrincipalRes} from "$lib/api/core/data-contracts";
    import {z} from "zod";
    import type {FormOptions} from "formsnap";
    import {toResult} from "$lib/utility";
    import {api} from "../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Table from "$lib/components/ui/table";
    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    //@ts-ignore
    import * as Form from "$lib/components/ui/form";

    export let user: UserPrincipalRes;
    export let wallet: WalletPrincipalRes;

    export let admin: boolean = false;

    const fff: any = undefined;

    const transferObjectSchema: any = z.object({
        amount: z
            .coerce
            .number()
            .min(0, "Amount must be greater than 0")
            .finite("Amount must be a finite number"),

        desc: z.string()
            .min(2, "Description must be at least 2 characters long")
            .max(4096, "Description must be less than 4096 characters long")
    });


    const adminInOptions: any = {
        SPA: true,
        validators: transferObjectSchema,
        onUpdate({form}) {
            if (form.valid) {
                adminIn(form.data.amount, form.data.desc);
            }
        },
    } satisfies FormOptions<typeof transferObjectSchema>;

    const adminOutOptions: any  = {
        SPA: true,
        validators: transferObjectSchema,
        onUpdate({form}) {
            if (form.valid) {
                adminOut(form.data.amount, form.data.desc);
            }
        },
    } satisfies FormOptions<typeof transferObjectSchema>;

    const promoOptions: any = {
        SPA: true,
        validators: transferObjectSchema,
        onUpdate({form}) {
            if (form.valid) {
                promo(form.data.amount, form.data.desc);
            }
        },
    } satisfies FormOptions<typeof transferObjectSchema>;

    async function adminIn(amount: number, desc: string) {

        await toResult(() => $api.vAdminInflowCreate(
            user?.id ?? "", "1.0", {amount, desc}
        ), "Failed to create admin inflow").match({
            ok: () => {
                toast.info(`Successfully added SGD ${amount.toFixed(2)} to user's account.`);
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail);
            }
        })

    }

    async function adminOut(amount: number, desc: string) {
        await toResult(() => $api.vAdminOutflowCreate(
            user?.id ?? "", "1.0", {amount, desc}
        ), "Failed to create admin outflow").match({
            ok: () => {
                toast.info(`Successfully deducted SGD ${amount.toFixed(2)} to user's account.`);
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail);
            }
        })
    }

    async function promo(amount: number, desc: string) {
        await toResult(() => $api.vAdminPromoCreate(
            user?.id ?? "", "1.0", {amount, desc}
        ), "Failed to create promo transfer").match({
            ok: () => {
                toast.info(`Successfully add SGD ${amount.toFixed(2)} worth of Promo Credit to user's account.`);
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail);
            }
        })
    }

</script>


<Card.Root>
    <Card.Header>
        <Card.Title>{user.username}</Card.Title>
        <Card.Description>{user.id}</Card.Description>
    </Card.Header>
    <Card.Content>
        <Table.Root>
            <Table.Header>
                <Table.Row>
                    <Table.Head>Account</Table.Head>
                    <Table.Head>Amount</Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                <Table.Row>
                    <Table.Cell>USABLE</Table.Cell>
                    <Table.Cell>SGD {wallet.usable.toFixed(2)}</Table.Cell>
                </Table.Row>
                <Table.Row>
                    <Table.Cell>BOOKING RESERVE</Table.Cell>
                    <Table.Cell>SGD {wallet.bookingReserve.toFixed(2)}</Table.Cell>
                </Table.Row>
                <Table.Row>
                    <Table.Cell>WITHDRAW RESERVE</Table.Cell>
                    <Table.Cell>SGD {wallet.withdrawReserve.toFixed(2)}</Table.Cell>
                </Table.Row>
            </Table.Body>
        </Table.Root>
    </Card.Content>
    {#if admin }
        <Card.Footer>
            <div class="flex gap-4 flex-row flex-wrap w-full justify-center">
                <Dialog.Root>
                    <Dialog.Trigger class="w-full max-w-80  {buttonVariants({ variant: 'default' })}">
                        Add Usable Balance
                    </Dialog.Trigger>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>Add Usable Balance</Dialog.Title>
                            <Dialog.Description>
                                <div class="flex flex-col gap-4">
                                    <p class="text-justify">
                                        You will be adding usable balance to user
                                        <code class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
                                        >{user?.id?.trim() ?? ''}</code>'s
                                        account.
                                    </p>
                                    <Form.Root options={adminInOptions}
                                               schema={transferObjectSchema}
                                               form={fff}
                                               let:config>
                                        <Form.Field {config} name="desc">
                                            <Form.Item class="my-4">
                                                <Form.Input placeholder="Description"/>

                                                <Form.Validation/>
                                            </Form.Item>
                                        </Form.Field>
                                        <Form.Field {config} name="amount">
                                            <Form.Item class="my-4">
                                                <Form.Input placeholder="Amount"/>
                                                <Form.Validation class="text-sm"/>
                                            </Form.Item>
                                        </Form.Field>
                                        <Form.Button class="my-4">Confirm</Form.Button>
                                    </Form.Root>
                                </div>
                            </Dialog.Description>
                        </Dialog.Header>
                    </Dialog.Content>
                </Dialog.Root>

                <Dialog.Root>
                    <Dialog.Trigger class="w-full max-w-80  {buttonVariants({ variant: 'default' })}">
                        Deduct Usable Balance
                    </Dialog.Trigger>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>Deduct Usable Balance</Dialog.Title>
                            <Dialog.Description>
                                <div class="flex flex-col gap-4">
                                    <p class="text-justify">
                                        You will be deducting usable balance from user
                                        <code class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
                                        >{user?.id?.trim() ?? ''}</code>'s
                                        account.
                                    </p>

                                    <Form.Root options={adminOutOptions}
                                               schema={transferObjectSchema}
                                               form={fff}
                                               let:config>
                                        <Form.Field {config} name="desc">
                                            <Form.Item class="my-4">
                                                <Form.Input placeholder="Description"/>
                                                <Form.Validation/>
                                            </Form.Item>
                                        </Form.Field>
                                        <Form.Field {config} name="amount">
                                            <Form.Item class="my-4">
                                                <Form.Input placeholder="Amount"/>
                                                <Form.Validation class="text-sm"/>
                                            </Form.Item>
                                        </Form.Field>
                                        <Form.Button class="my-4">Confirm</Form.Button>
                                    </Form.Root>
                                </div>
                            </Dialog.Description>
                        </Dialog.Header>
                    </Dialog.Content>
                </Dialog.Root>

                <Dialog.Root>
                    <Dialog.Trigger class="w-full max-w-80  {buttonVariants({ variant: 'default' })}">
                        Give Promo Credits
                    </Dialog.Trigger>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>Give Promo Credits</Dialog.Title>
                            <Dialog.Description>
                                <div class="flex flex-col gap-4">
                                    <p class="text-justify">
                                        You will be adding promotional credits to user
                                        <code class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
                                        >{user?.id?.trim() ?? 'unknown'}</code>'s
                                        account.
                                    </p>
                                    <Form.Root options={promoOptions} schema={transferObjectSchema}
                                               form={fff}
                                               let:config>
                                        <Form.Field {config} name="desc">
                                            <Form.Item class="my-4">
                                                <Form.Input placeholder="Description"/>

                                                <Form.Validation/>
                                            </Form.Item>
                                        </Form.Field>
                                        <Form.Field {config} name="amount">
                                            <Form.Item class="my-4">
                                                <Form.Input placeholder="Amount"/>
                                                <Form.Validation class="text-sm"/>
                                            </Form.Item>
                                        </Form.Field>
                                        <Form.Button class="my-4">Confirm</Form.Button>
                                    </Form.Root>
                                </div>
                            </Dialog.Description>
                        </Dialog.Header>
                    </Dialog.Content>
                </Dialog.Root>
            </div>

        </Card.Footer>
    {/if}
</Card.Root>
