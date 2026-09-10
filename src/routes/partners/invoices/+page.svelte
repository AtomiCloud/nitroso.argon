<script lang="ts">
    import {onMount} from "svelte";
    import {page} from "$app/stores";
    import {api} from "../../../store";
    import {config} from "../../../config/shared";
    import {signIn} from "@auth/sveltekit/client";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";

    //@ts-ignore
    import * as Table from "$lib/components/ui/table";

    //@ts-ignore
    import * as Select from "$lib/components/ui/select";

    //@ts-ignore
    import * as Alert from "$lib/components/ui/alert";

    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";

    import type {Selected} from "bits-ui";
    import {Button} from "$lib/components/ui/button";
    import {Badge} from "$lib/components/ui/badge";
    import {Input} from "$lib/components/ui/input";
    import {AlertTriangle, FileText, LucideLoader, RotateCw} from "lucide-svelte";
    import Loader from "$lib/components/complex/loader.svelte";
    import InfoTip from "$lib/components/core/InfoTip.svelte";
    import {toast} from "svelte-sonner";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatNumber} from "$lib/i18n";
    import {singaporeToday} from "$lib/time/singapore";
    import {expired, toResult} from "$lib/utility";
    import {triggerBlobDownload} from "$lib/components/entities/Withdrawals/withdrawal-export";
    import {
        assemblePreviewRequest,
        blockingReasons,
        byMonthDescending,
        defaultDueDate,
        defaultIssueDate,
        defaultMonth,
        defaultSeq,
        emptyManualInputs,
        faresFromKtmbCost,
        fxRate,
        monthName,
        monthParam,
        payableTotal,
        periodMonthParam,
        recentMonths,
        statusVariant,
        type InvoiceComputedRes,
        type InvoiceDocumentRes,
        type InvoiceInputRowRes,
        type InvoiceSummaryRes,
        type InvoiceTermsRes,
        type ManualInputs,
        type PreviewInvoiceReq,
    } from "./invoices";
    import {
        getInputs,
        getSettings,
        issue as issueInvoice,
        list as listInvoices,
        openPreviewDocument,
        openStoredDocument,
        preview as previewInvoice,
        saveDraft,
        voidInvoice,
        type ApiContext,
        type ApiResult,
    } from "./invoice-api";

    // Owner-only on-demand invoice generator (server-side gated in
    // +page.server.ts with the same admin+owner pair /partners uses; zinc
    // enforces it again per endpoint).
    //
    // WHAT THIS REPLACES. A month's partner invoice used to be built by hand on
    // a laptop — two Airwallex exports, a hand-filled JSON file of ~25 numbers,
    // three scripts and a screenshot check. Hours per month, and it produced
    // real errors that reached issued documents. Here: pick a month, look at
    // what zinc gathered, type the handful it genuinely cannot know, preview,
    // issue.
    //
    // THE SHAPE OF THE PAGE follows the order the work actually happens in, top
    // to bottom: month → what was gathered → what you must supply → what it
    // computes → what you do with it. The stored invoices sit at the bottom
    // because they are the record, not the task.
    //
    // NOTHING HERE COMPUTES MONEY. Every figure below either came from zinc's
    // gather or from zinc's engine; the assembly in ./invoices.ts only shapes
    // the request. That is deliberate — a second implementation of the split
    // would be a second thing to be wrong.

    // ---- API plumbing --------------------------------------------------
    //
    // Hand-rolled rather than through the generated SDK: the SDK is generated
    // by `task sdk-gen` against a LIVE API, so these endpoints cannot be in it
    // until zinc deploys. Documented at the top of ./invoice-api.ts.
    const baseUrl = `${config.api.scheme}://${config.api.domain}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $: session = $page.data.session as any;

    function ctx(): ApiContext | null {
        if (session?.access_token == null || expired(session.access_token, new Date())) return null;
        return {baseUrl, accessToken: session.access_token, fetch};
    }

    /**
     * Run one API call, handling the two failures every call shares: a bearer
     * the server rejects (re-authenticate — a toast would strand the operator
     * on a dead button, per ExportWithdrawals.svelte), and anything else
     * (surface zinc's own reason, which is the part that says what to fix).
     */
    async function callApi<T>(fn: (c: ApiContext) => Promise<ApiResult<T>>): Promise<T | null> {
        const c = ctx();
        if (c == null) {
            await signIn("descope");
            return null;
        }
        const r = await fn(c);
        // `=== false` rather than `!r.ok`: this project compiles with
        // strictNullChecks off, under which the negation does not narrow the
        // union and `r.message` stops existing. Same idiom as
        // ExportWithdrawals.svelte.
        if (r.ok === false) {
            if (r.reauth === true) await signIn("descope");
            else toast.error(r.message);
            return null;
        }
        return r.value;
    }

    const failed = (key: string) => $_(key, {locale: $lang});

    // ---- month selection -----------------------------------------------
    //
    // On Singapore's calendar: the invoice's month boundaries are SGT, and a
    // browser in another timezone must not offer a different "last month"
    // around local midnight.
    const today = singaporeToday();
    const months = recentMonths(defaultMonth({year: today.year, month: today.month}));

    let selected: Selected<string> = {value: monthParam(months[0]), label: monthName(months[0])};
    $: month = months.find(m => monthParam(m) === selected.value) ?? months[0];

    // ---- gathered state --------------------------------------------------
    //
    // Three independent fetches, each tolerating its own failure so one
    // outage does not blank the page. Race-guarded with a token counter (same
    // convention as /pnl): switching months quickly would otherwise let a
    // slow response for August overwrite September's.
    let inputs: InvoiceInputRowRes | null = null;
    let terms: InvoiceTermsRes | null = null;
    let fares: Record<string, number> = {};
    let loading = false;
    let loadToken = 0;

    async function load() {
        const myToken = ++loadToken;
        loading = true;
        // Clearing first is the point: a stale card next to a new month's
        // heading is how somebody invoices August's figures as September.
        inputs = null;
        computed = null;
        computedFor = null;

        const c = ctx();
        if (c == null) {
            loading = false;
            await signIn("descope");
            return;
        }

        const [i, s] = await Promise.all([
            getInputs(c, monthParam(month), failed("invoices.errors.inputs")),
            getSettings(c, failed("invoices.errors.settings")),
        ]);
        // The fares come from the bookings API, which the generated SDK does
        // cover, so it is used rather than hand-rolled.
        const f = await toResult(() => $api.vBookingKtmbCostCurrentDetail("1"),
            failed("invoices.errors.fares")).match({
            ok: (r) => r.current as Record<string, number>,
            err: (e) => {
                console.error(e);
                return null;
            },
        });

        if (myToken !== loadToken) return;

        if (i.ok === false) {
            if (i.reauth === true) await signIn("descope");
            else toast.error(i.message);
        } else {
            inputs = i.value;
            manual = emptyManualInputs(i.value);
        }

        // A settings failure does not re-authenticate on its own — the inputs
        // call above already did if the bearer was the problem, and two
        // sign-in redirects from one reload is worse than one.
        if (s.ok === false) {
            if (s.reauth !== true) toast.error(s.message);
        } else terms = s.value.current;

        fares = faresFromKtmbCost(f);
        loading = false;
    }

    function monthChange(s: Selected<string> | undefined) {
        if (s == null) return;
        selected = s;
        load();
    }

    // ---- what the operator supplies -------------------------------------
    //
    // See ManualInputs in ./invoices.ts for why each of these cannot be
    // gathered. They start empty, which is the honest default: an unfilled
    // figure is zero, and zero is what most months genuinely are.
    let manual: ManualInputs = emptyManualInputs(null);

    // Recovery is opt-in per month. It charges the partners for what they sold
    // outside the system, so it must be a decision somebody made about that
    // month rather than a number that persists silently from the last one.
    let recoveryOn = false;
    let recoveryBoosts = 0;
    let recoveryTickets = 0;
    $: manual.recovery = recoveryOn
        ? {freeBoosts: Number(recoveryBoosts) || 0, tickets: Number(recoveryTickets) || 0}
        : null;

    let issueDate = "";
    let dueDate = "";
    let seq = "";
    $: if (month) {
        issueDate = defaultIssueDate(month);
        dueDate = defaultDueDate(issueDate);
        seq = defaultSeq(month);
    }

    $: blocked = blockingReasons(inputs, terms, fares);
    $: rate = inputs == null ? 0 : fxRate(inputs.topups);
    $: totalTickets = (inputs?.routes ?? []).reduce((a, r) => a + r.tickets, 0);
    $: totalRevenue = (inputs?.routes ?? []).reduce((a, r) => a + r.revenue, 0);

    function request(): PreviewInvoiceReq | null {
        if (inputs == null || terms == null) return null;
        return assemblePreviewRequest({
            month,
            inputs,
            terms,
            fares,
            manual,
            issueDate,
            dueDate,
            seq,
        });
    }

    // ---- preview ---------------------------------------------------------
    //
    // computedFor pins WHICH request produced the figures on screen. Editing a
    // manual field after previewing invalidates them, and showing a stale
    // payable next to changed inputs is the single most dangerous thing this
    // page could do.
    let computed: InvoiceComputedRes | null = null;
    let computedFor: string | null = null;
    let previewing = false;

    // Every dependency is named here rather than left inside request(): Svelte
    // only tracks what a reactive statement mentions textually, so a
    // `JSON.stringify(request())` alone would go stale the moment a manual
    // field changed — which is precisely the case this exists to catch.
    $: currentRequest = requestKey(month, inputs, terms, fares, manual, issueDate, dueDate, seq);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function requestKey(..._deps: unknown[]): string | null {
        const req = request();
        return req == null ? null : JSON.stringify(req);
    }

    $: stale = computed != null && computedFor != null && computedFor !== currentRequest;

    async function runPreview() {
        if (previewing) return;
        const req = request();
        if (req == null) return;
        previewing = true;
        try {
            const r = await callApi(c => previewInvoice(c, req, failed("invoices.errors.preview")));
            if (r != null) {
                computed = r;
                computedFor = JSON.stringify(req);
            }
        } finally {
            previewing = false;
        }
    }

    // ---- documents -------------------------------------------------------
    //
    // Served as HTML, opened in a tab: the browser's own print engine is what
    // produced every issued PDF so far, against this same stylesheet. Ctrl+P →
    // Save as PDF is the same engine on the same input, for no new dependency.
    // A plain window.open cannot carry the bearer, so the document is fetched
    // here and handed over as an object URL.
    function present(blob: Blob) {
        const url = URL.createObjectURL(blob);
        const opened = window.open(url, "_blank", "noopener");
        if (opened == null) {
            // Pop-up blocked. Falling back to a download is better than
            // silently doing nothing, and reuses the tested helper.
            triggerBlobDownload(blob, `invoice-${monthParam(month)}.html`, {
                createObjectURL: URL.createObjectURL,
                revokeObjectURL: URL.revokeObjectURL,
                createAnchor: () => document.createElement("a"),
                append: (a) => document.body.append(a),
                defer: (cb, ms) => setTimeout(cb, ms),
            });
            URL.revokeObjectURL(url);
            return;
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }

    let documentBusy = "";

    async function openPreviewFor(suffix: string) {
        const req = request();
        if (req == null || documentBusy !== "") return;
        documentBusy = suffix;
        try {
            await callApi(c => openPreviewDocument(c, req, suffix, failed("invoices.errors.document"), present));
        } finally {
            documentBusy = "";
        }
    }

    async function openStoredFor(id: string, suffix: string) {
        if (documentBusy !== "") return;
        documentBusy = `${id}:${suffix}`;
        try {
            await callApi(c => openStoredDocument(c, id, suffix, failed("invoices.errors.document"), present));
        } finally {
            documentBusy = "";
        }
    }

    // ---- saving and issuing ----------------------------------------------
    let saving = false;

    async function save(): Promise<InvoiceDocumentRes | null> {
        const req = request();
        if (req == null || saving) return null;
        saving = true;
        try {
            const r = await callApi(c => saveDraft(c, {
                periodMonth: periodMonthParam(month),
                seq,
                // How July and August were actually produced, and therefore
                // the honest basis for a new month. Frozen at issue, so a
                // later refund cannot restate a settled invoice.
                ticketBasis: "status_today",
                issueDate,
                dueDate,
                inputs: req,
            }, failed("invoices.errors.save")));
            if (r != null) {
                toast.success($_("invoices.saved", {locale: $lang}));
                await loadList();
            }
            return r;
        } finally {
            saving = false;
        }
    }

    // Issuing is the freeze: after it the figures never recompute, so
    // re-opening the month shows what was actually paid rather than what
    // today's engine would say. Confirmed rather than one-click for that
    // reason — withdrawing it is a void with a reason, not a delete.
    let issueOpen = false;
    let issuing = false;

    async function confirmIssue() {
        if (issuing) return;
        issuing = true;
        try {
            const draft = await save();
            if (draft == null) return;
            const r = await callApi(c => issueInvoice(c, draft.id, failed("invoices.errors.issue")));
            if (r != null) {
                toast.success($_("invoices.issued", {locale: $lang}));
                issueOpen = false;
                await loadList();
            }
        } finally {
            issuing = false;
        }
    }

    // ---- the stored record -----------------------------------------------
    let stored: InvoiceSummaryRes[] = [];
    let listLoading = false;
    let listFailed = false;

    async function loadList() {
        listLoading = true;
        listFailed = false;
        const r = await callApi(c => listInvoices(c, failed("invoices.errors.list")));
        if (r == null) listFailed = true;
        else stored = [...r].sort(byMonthDescending);
        listLoading = false;
    }

    let voidOpen = false;
    let voidTarget: InvoiceSummaryRes | null = null;
    let voidReason = "";
    let voiding = false;

    function askVoid(inv: InvoiceSummaryRes) {
        voidTarget = inv;
        voidReason = "";
        voidOpen = true;
    }

    async function confirmVoid() {
        if (voiding || voidTarget == null || voidReason.trim() === "") return;
        voiding = true;
        try {
            const r = await callApi(c => voidInvoice(c, voidTarget!.id, voidReason.trim(),
                failed("invoices.errors.void")));
            if (r != null) {
                toast.success($_("invoices.voided", {locale: $lang}));
                voidOpen = false;
                await loadList();
            }
        } finally {
            voiding = false;
        }
    }

    onMount(() => {
        load();
        loadList();
    });
</script>

<div class="flex flex-col">
    <div class="border-b bg-muted">
        <div class="flex justify-center sm:justify-between gap-4 flex-wrap py-8 items-center text-foreground max-w-[1200px] w-11/12 mx-auto">
            <div class="text-3xl lg:text-4xl">
                {$_('invoices.title', { locale: $lang })}
            </div>
            <Button variant="outline" disabled={loading} on:click={() => { load(); loadList(); }}>
                {#if loading}
                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                {:else}
                    <RotateCw class="mr-2 h-4 w-4"/>
                {/if}
                {$_('invoices.reload', { locale: $lang })}
            </Button>
        </div>
    </div>

    <div class="flex flex-col gap-4 w-full px-2 sm:px-0 sm:w-11/12 max-w-[1200px] mx-auto my-4 sm:my-8">

        <!-- month picker -->
        <div class="-mx-2 px-2 py-2 sm:mx-0 sm:px-3 bg-background border-y sm:border sm:rounded-lg flex flex-wrap gap-2 items-center">
            <span class="text-sm font-medium">{$_('invoices.month', { locale: $lang })}</span>
            <Select.Root selected={selected} onSelectedChange={monthChange}>
                <Select.Trigger class="h-8 w-48 text-xs">
                    <Select.Value/>
                </Select.Trigger>
                <Select.Content>
                    {#each months as m (monthParam(m))}
                        <Select.Item value={monthParam(m)} label={monthName(m)}>{monthName(m)}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
            <span class="text-xs text-muted-foreground">{$_('invoices.monthHint', { locale: $lang })}</span>
        </div>

        {#if blocked.length > 0 && !loading}
            <!-- Every reason at once, not one per round trip. Each of these
                 would otherwise produce a complete, plausible-looking invoice
                 with a wrong payable — worse than an error, because nobody
                 re-reads a settled month. -->
            <Alert.Root variant="destructive">
                <AlertTriangle class="h-4 w-4"/>
                <Alert.Title>{$_('invoices.blockedTitle', { locale: $lang })}</Alert.Title>
                <Alert.Description>
                    <ul class="list-disc pl-4">
                        {#each blocked as reason (reason)}
                            <li>{$_(reason, { locale: $lang })}</li>
                        {/each}
                    </ul>
                </Alert.Description>
            </Alert.Root>
        {/if}

        <!-- 1. WHAT ZINC GATHERED. Read-only: this is the part that used to be
             an afternoon of exports and hand-typing. -->
        <Card.Root>
            <Card.Header class="p-4 sm:p-6">
                <Card.Title>{$_('invoices.gathered.title', { locale: $lang })}</Card.Title>
                <Card.Description>{$_('invoices.gathered.description', { locale: $lang })}</Card.Description>
            </Card.Header>
            <Card.Content class="px-2 sm:px-6">
                {#if loading && inputs == null}
                    <Loader/>
                {:else if inputs == null}
                    <p class="text-sm text-muted-foreground px-2">{$_('invoices.gathered.none', { locale: $lang })}</p>
                {:else}
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 px-2 pb-4">
                        <div>
                            <div class="text-xs text-muted-foreground">{$_('invoices.gathered.tickets', { locale: $lang })}</div>
                            <div class="text-lg font-medium">{formatNumber(totalTickets, $lang)}</div>
                        </div>
                        <div>
                            <div class="text-xs text-muted-foreground">{$_('invoices.gathered.revenue', { locale: $lang })}</div>
                            <div class="text-lg font-medium">{formatMoney(totalRevenue, $lang)}</div>
                        </div>
                        <div>
                            <div class="text-xs text-muted-foreground">{$_('invoices.gathered.deposits', { locale: $lang })}</div>
                            <div class="text-lg font-medium">{formatMoney(inputs.grossDeposits, $lang)}</div>
                        </div>
                        <div>
                            <div class="text-xs text-muted-foreground">{$_('invoices.gathered.fees', { locale: $lang })}</div>
                            <div class="text-lg font-medium">{formatMoney(inputs.fees.gateway + inputs.fees.paymentMethod, $lang)}</div>
                        </div>
                        <div>
                            <div class="text-xs text-muted-foreground inline-flex items-center gap-1">
                                {$_('invoices.gathered.topups', { locale: $lang })}
                                <InfoTip label={$_('invoices.gathered.topups', { locale: $lang })}>
                                    {$_('invoices.gathered.topupsHint', { locale: $lang })}
                                </InfoTip>
                            </div>
                            <div class="text-lg font-medium">
                                {formatMoney(inputs.topups.myr, $lang, { currency: 'MYR' })}
                            </div>
                        </div>
                        <div>
                            <div class="text-xs text-muted-foreground">{$_('invoices.gathered.fxRate', { locale: $lang })}</div>
                            <div class="text-lg font-medium">{rate === 0 ? '—' : rate.toFixed(5)}</div>
                        </div>
                        <div>
                            <div class="text-xs text-muted-foreground">{$_('invoices.gathered.withdrawals', { locale: $lang })}</div>
                            <div class="text-lg font-medium">{formatNumber(inputs.withdrawals.count, $lang)}</div>
                        </div>
                        <div>
                            <div class="text-xs text-muted-foreground">{$_('invoices.gathered.infrastructure', { locale: $lang })}</div>
                            <div class="text-lg font-medium">{terms == null ? '—' : formatMoney(terms.infrastructure, $lang)}</div>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <Table.Root>
                            <Table.Header>
                                <Table.Row>
                                    <Table.Head class="h-8 px-2 whitespace-nowrap">{$_('invoices.gathered.colRoute', { locale: $lang })}</Table.Head>
                                    <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('invoices.gathered.colTickets', { locale: $lang })}</Table.Head>
                                    <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('invoices.gathered.colRevenue', { locale: $lang })}</Table.Head>
                                    <Table.Head class="h-8 px-2 text-right whitespace-nowrap">
                                        <span class="inline-flex items-center gap-1">
                                            {$_('invoices.gathered.colFare', { locale: $lang })}
                                            <InfoTip label={$_('invoices.gathered.colFare', { locale: $lang })}>
                                                {$_('invoices.gathered.fareHint', { locale: $lang })}
                                            </InfoTip>
                                        </span>
                                    </Table.Head>
                                    <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('invoices.gathered.colTerminated', { locale: $lang })}</Table.Head>
                                    <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('invoices.gathered.colBoosts', { locale: $lang })}</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each inputs.routes as r (r.key)}
                                    <Table.Row>
                                        <Table.Cell class="px-2 py-1.5 font-medium whitespace-nowrap">
                                            {$_(`invoices.routes.${r.key}`, { locale: $lang })}
                                        </Table.Cell>
                                        <Table.Cell class="px-2 py-1.5 text-right">{formatNumber(r.tickets, $lang)}</Table.Cell>
                                        <Table.Cell class="px-2 py-1.5 text-right">{formatMoney(r.revenue, $lang)}</Table.Cell>
                                        <Table.Cell class="px-2 py-1.5 text-right {(fares[r.key] ?? 0) <= 0 && r.tickets > 0 ? 'text-destructive font-medium' : ''}">
                                            {(fares[r.key] ?? 0) <= 0 ? '—' : formatMoney(fares[r.key], $lang, { currency: 'MYR' })}
                                        </Table.Cell>
                                        <Table.Cell class="px-2 py-1.5 text-right">{formatNumber(r.terminated.count, $lang)}</Table.Cell>
                                        <Table.Cell class="px-2 py-1.5 text-right">
                                            {formatNumber(r.priority.paid, $lang)}
                                            <span class="text-xs text-muted-foreground">
                                                (+{formatNumber(r.priority.free, $lang)})
                                            </span>
                                        </Table.Cell>
                                    </Table.Row>
                                {/each}
                            </Table.Body>
                        </Table.Root>
                    </div>
                {/if}
            </Card.Content>
        </Card.Root>

        <!-- 2. WHAT ONLY THE OPERATOR KNOWS. Each field is a fact that lives
             outside zinc's records — see ManualInputs in ./invoices.ts. -->
        <Card.Root>
            <Card.Header class="p-4 sm:p-6">
                <Card.Title>{$_('invoices.manual.title', { locale: $lang })}</Card.Title>
                <Card.Description>{$_('invoices.manual.description', { locale: $lang })}</Card.Description>
            </Card.Header>
            <Card.Content class="px-4 sm:px-6 flex flex-col gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium" for="inv-seq">{$_('invoices.manual.seq', { locale: $lang })}</label>
                        <Input id="inv-seq" bind:value={seq}/>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium" for="inv-issue">{$_('invoices.manual.issueDate', { locale: $lang })}</label>
                        <Input id="inv-issue" bind:value={issueDate}/>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium" for="inv-due">{$_('invoices.manual.dueDate', { locale: $lang })}</label>
                        <Input id="inv-due" bind:value={dueDate}/>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium inline-flex items-center gap-1" for="inv-kept">
                            {$_('invoices.manual.priorityKept', { locale: $lang })}
                            <InfoTip label={$_('invoices.manual.priorityKept', { locale: $lang })}>
                                {$_('invoices.manual.priorityKeptHint', { locale: $lang })}
                            </InfoTip>
                        </label>
                        <Input id="inv-kept" type="number" step="0.01" bind:value={manual.priorityKept.amount}/>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium" for="inv-kept-count">{$_('invoices.manual.priorityKeptCount', { locale: $lang })}</label>
                        <Input id="inv-kept-count" type="number" bind:value={manual.priorityKept.count}/>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium inline-flex items-center gap-1" for="inv-transfers">
                            {$_('invoices.manual.netTransfers', { locale: $lang })}
                            <InfoTip label={$_('invoices.manual.netTransfers', { locale: $lang })}>
                                {$_('invoices.manual.netTransfersHint', { locale: $lang })}
                            </InfoTip>
                        </label>
                        <Input id="inv-transfers" type="number" step="0.01" bind:value={manual.netTransfers}/>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium" for="inv-promo-count">{$_('invoices.manual.promotionalCount', { locale: $lang })}</label>
                        <Input id="inv-promo-count" type="number" bind:value={manual.promotional.count}/>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium inline-flex items-center gap-1" for="inv-promo">
                            {$_('invoices.manual.promotional', { locale: $lang })}
                            <InfoTip label={$_('invoices.manual.promotional', { locale: $lang })}>
                                {$_('invoices.manual.promotionalHint', { locale: $lang })}
                            </InfoTip>
                        </label>
                        <Input id="inv-promo" type="number" step="0.01" bind:value={manual.promotional.amount}/>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-medium inline-flex items-center gap-1" for="inv-dup">
                            {$_('invoices.manual.duplicates', { locale: $lang })}
                            <InfoTip label={$_('invoices.manual.duplicates', { locale: $lang })}>
                                {$_('invoices.manual.duplicatesHint', { locale: $lang })}
                            </InfoTip>
                        </label>
                        <Input id="inv-dup" type="number" step="0.01" bind:value={manual.duplicates.refunded}/>
                    </div>
                </div>

                <!-- Recovery: what the partners sold outside the system. Opt-in
                     per month on purpose — it MOVES what they are paid, so it
                     has to be a decision about this month rather than a value
                     that carried over unnoticed from the last one. -->
                <div class="flex flex-col gap-2 border-t pt-4">
                    <label class="flex items-center gap-2 text-sm font-medium">
                        <input type="checkbox" bind:checked={recoveryOn} class="h-4 w-4"/>
                        {$_('invoices.manual.recovery', { locale: $lang })}
                        <InfoTip label={$_('invoices.manual.recovery', { locale: $lang })}>
                            {$_('invoices.manual.recoveryHint', { locale: $lang })}
                        </InfoTip>
                    </label>
                    {#if recoveryOn}
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="flex flex-col gap-1">
                                <label class="text-sm" for="inv-rec-boosts">
                                    {$_('invoices.manual.recoveryBoosts', { locale: $lang, values: { rate: terms == null ? '—' : formatMoney(terms.recoveryPerBoost, $lang) } })}
                                </label>
                                <Input id="inv-rec-boosts" type="number" bind:value={recoveryBoosts}/>
                            </div>
                            <div class="flex flex-col gap-1">
                                <label class="text-sm" for="inv-rec-tickets">
                                    {$_('invoices.manual.recoveryTickets', { locale: $lang, values: { rate: terms == null ? '—' : formatMoney(terms.recoveryPerTicket, $lang) } })}
                                </label>
                                <Input id="inv-rec-tickets" type="number" bind:value={recoveryTickets}/>
                            </div>
                        </div>
                    {/if}
                </div>
            </Card.Content>
        </Card.Root>

        <!-- 3. WHAT IT COMPUTES. zinc's engine, not a second implementation
             here — the split is arithmetic nobody should be doing twice. -->
        <Card.Root>
            <Card.Header class="p-4 sm:p-6 flex-row items-center justify-between gap-4 flex-wrap">
                <div>
                    <Card.Title>{$_('invoices.computed.title', { locale: $lang })}</Card.Title>
                    <Card.Description>{$_('invoices.computed.description', { locale: $lang })}</Card.Description>
                </div>
                <Button disabled={previewing || blocked.length > 0 || loading} on:click={runPreview}>
                    {#if previewing}
                        <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                    {/if}
                    {$_('invoices.computed.preview', { locale: $lang })}
                </Button>
            </Card.Header>
            <Card.Content class="px-2 sm:px-6">
                {#if computed == null}
                    <p class="text-sm text-muted-foreground px-2">{$_('invoices.computed.none', { locale: $lang })}</p>
                {:else}
                    {#if stale}
                        <!-- The figures below were computed from DIFFERENT
                             inputs than the ones now on screen. -->
                        <Alert.Root variant="destructive" class="mb-4">
                            <AlertTriangle class="h-4 w-4"/>
                            <Alert.Description>{$_('invoices.computed.stale', { locale: $lang })}</Alert.Description>
                        </Alert.Root>
                    {/if}
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 px-2 pb-4">
                        <div>
                            <div class="text-xs text-muted-foreground">{$_('invoices.computed.tickets', { locale: $lang })}</div>
                            <div class="text-lg font-medium">{formatNumber(computed.totals.tickets, $lang)}</div>
                        </div>
                        <div>
                            <div class="text-xs text-muted-foreground">{$_('invoices.computed.revenue', { locale: $lang })}</div>
                            <div class="text-lg font-medium">{formatMoney(computed.totals.revenue, $lang)}</div>
                        </div>
                        <div>
                            <div class="text-xs text-muted-foreground">{$_('invoices.computed.netProfit', { locale: $lang })}</div>
                            <div class="text-lg font-medium">{formatMoney(computed.result.netProfit, $lang)}</div>
                        </div>
                        <div>
                            <div class="text-xs text-muted-foreground inline-flex items-center gap-1">
                                {$_('invoices.computed.payable', { locale: $lang })}
                                <InfoTip label={$_('invoices.computed.payable', { locale: $lang })}>
                                    {$_('invoices.computed.payableHint', { locale: $lang })}
                                </InfoTip>
                            </div>
                            <div class="text-lg font-medium">{formatMoney(payableTotal(computed), $lang)}</div>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <Table.Root>
                            <Table.Header>
                                <Table.Row>
                                    <Table.Head class="h-8 px-2 whitespace-nowrap">{$_('invoices.computed.colPartner', { locale: $lang })}</Table.Head>
                                    <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('invoices.computed.colEarned', { locale: $lang })}</Table.Head>
                                    <Table.Head class="h-8 px-2 text-right whitespace-nowrap">
                                        <span class="inline-flex items-center gap-1">
                                            {$_('invoices.computed.colAdvance', { locale: $lang })}
                                            <InfoTip label={$_('invoices.computed.colAdvance', { locale: $lang })}>
                                                {$_('invoices.computed.advanceHint', { locale: $lang })}
                                            </InfoTip>
                                        </span>
                                    </Table.Head>
                                    <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('invoices.computed.colAmount', { locale: $lang })}</Table.Head>
                                    <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('invoices.computed.colDocument', { locale: $lang })}</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each computed.result.shares as s (s.suffix)}
                                    <Table.Row>
                                        <Table.Cell class="px-2 py-1.5 font-medium whitespace-nowrap">{s.name}</Table.Cell>
                                        <Table.Cell class="px-2 py-1.5 text-right">{formatMoney(s.earned, $lang)}</Table.Cell>
                                        <Table.Cell class="px-2 py-1.5 text-right">{s.advance === 0 ? '—' : formatMoney(-s.advance, $lang)}</Table.Cell>
                                        <Table.Cell class="px-2 py-1.5 text-right font-medium">{formatMoney(s.amount, $lang)}</Table.Cell>
                                        <Table.Cell class="px-2 py-1.5 text-right">
                                            <Button variant="ghost" size="sm" class="h-7"
                                                    disabled={documentBusy !== '' || stale}
                                                    on:click={() => openPreviewFor(s.suffix)}>
                                                {#if documentBusy === s.suffix}
                                                    <LucideLoader class="h-3.5 w-3.5 animate-spin"/>
                                                {:else}
                                                    <FileText class="h-3.5 w-3.5"/>
                                                {/if}
                                            </Button>
                                        </Table.Cell>
                                    </Table.Row>
                                {/each}
                            </Table.Body>
                        </Table.Root>
                    </div>

                    <div class="flex flex-wrap gap-2 justify-end px-2 py-4">
                        <Button variant="outline" disabled={saving || stale} on:click={save}>
                            {#if saving}
                                <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                            {/if}
                            {$_('invoices.saveDraft', { locale: $lang })}
                        </Button>
                        <Button disabled={issuing || stale} on:click={() => (issueOpen = true)}>
                            {$_('invoices.issue', { locale: $lang })}
                        </Button>
                    </div>
                {/if}
            </Card.Content>
        </Card.Root>

        <!-- 4. THE RECORD. What exists and what it paid — the first question
             anyone asks of this page is "what did we pay last month". -->
        <Card.Root>
            <Card.Header class="p-4 sm:p-6">
                <Card.Title>{$_('invoices.stored.title', { locale: $lang })}</Card.Title>
                <Card.Description>{$_('invoices.stored.description', { locale: $lang })}</Card.Description>
            </Card.Header>
            <Card.Content class="px-2 sm:px-6">
                {#if listFailed}
                    <div class="flex items-center gap-3 px-2">
                        <p class="text-sm text-destructive">{$_('invoices.errors.list', { locale: $lang })}</p>
                        <Button variant="outline" size="sm" disabled={listLoading} on:click={loadList}>
                            {$_('invoices.reload', { locale: $lang })}
                        </Button>
                    </div>
                {:else if listLoading && stored.length === 0}
                    <Loader/>
                {:else if stored.length === 0}
                    <p class="text-sm text-muted-foreground px-2">{$_('invoices.stored.none', { locale: $lang })}</p>
                {:else}
                    <div class="overflow-x-auto">
                        <Table.Root>
                            <Table.Header>
                                <Table.Row>
                                    <Table.Head class="h-8 px-2 whitespace-nowrap">{$_('invoices.stored.colMonth', { locale: $lang })}</Table.Head>
                                    <Table.Head class="h-8 px-2 whitespace-nowrap">{$_('invoices.stored.colStatus', { locale: $lang })}</Table.Head>
                                    <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('invoices.stored.colNetProfit', { locale: $lang })}</Table.Head>
                                    <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('invoices.stored.colPool', { locale: $lang })}</Table.Head>
                                    <Table.Head class="h-8 px-2 text-right whitespace-nowrap">{$_('invoices.stored.colActions', { locale: $lang })}</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each stored as inv (inv.id)}
                                    <Table.Row class={inv.status === 'void' ? 'text-muted-foreground/60 line-through' : ''}>
                                        <Table.Cell class="px-2 py-1.5 font-medium whitespace-nowrap">
                                            {inv.periodMonth} · {inv.seq}
                                        </Table.Cell>
                                        <Table.Cell class="px-2 py-1.5">
                                            <Badge variant={statusVariant(inv.status)}>
                                                {$_(`invoices.status.${inv.status}`, { locale: $lang })}
                                            </Badge>
                                            {#if inv.ticketBasis === 'transcribed_from_issued'}
                                                <!-- Transcribed months carry EngineVersion 0: the figures
                                                     are the paper document's, not this engine's. -->
                                                <InfoTip label={$_('invoices.stored.transcribed', { locale: $lang })}>
                                                    {$_('invoices.stored.transcribedHint', { locale: $lang })}
                                                </InfoTip>
                                            {/if}
                                        </Table.Cell>
                                        <Table.Cell class="px-2 py-1.5 text-right">{formatMoney(inv.netProfit, $lang)}</Table.Cell>
                                        <Table.Cell class="px-2 py-1.5 text-right">{formatMoney(inv.poolTotal, $lang)}</Table.Cell>
                                        <Table.Cell class="px-2 py-1.5 text-right whitespace-nowrap">
                                            {#each (terms?.partners ?? []) as p (p.suffix)}
                                                <Button variant="ghost" size="sm" class="h-7"
                                                        title={p.name}
                                                        disabled={documentBusy !== ''}
                                                        on:click={() => openStoredFor(inv.id, p.suffix)}>
                                                    {#if documentBusy === `${inv.id}:${p.suffix}`}
                                                        <LucideLoader class="h-3.5 w-3.5 animate-spin"/>
                                                    {:else}
                                                        <span class="text-xs">{p.suffix}</span>
                                                    {/if}
                                                </Button>
                                            {/each}
                                            {#if inv.status === 'issued'}
                                                <Button variant="ghost" size="sm" class="h-7 text-destructive"
                                                        on:click={() => askVoid(inv)}>
                                                    {$_('invoices.void', { locale: $lang })}
                                                </Button>
                                            {/if}
                                        </Table.Cell>
                                    </Table.Row>
                                {/each}
                            </Table.Body>
                        </Table.Root>
                    </div>
                {/if}
            </Card.Content>
        </Card.Root>
    </div>
</div>

<!-- Issue confirmation. The freeze is the whole point of the dialog: after
     this the figures never recompute. -->
<Dialog.Root bind:open={issueOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>{$_('invoices.issueConfirm.title', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                {$_('invoices.issueConfirm.body', {
                    locale: $lang,
                    values: {
                        month: monthName(month),
                        amount: computed == null ? '' : formatMoney(payableTotal(computed), $lang),
                    },
                })}
            </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
            <Button variant="outline" disabled={issuing} on:click={() => (issueOpen = false)}>
                {$_('invoices.cancel', { locale: $lang })}
            </Button>
            <Button disabled={issuing} on:click={confirmIssue}>
                {#if issuing}
                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                {/if}
                {$_('invoices.issue', { locale: $lang })}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<!-- Void. The reason is required by zinc, and by the failure it prevents:
     "there is a void invoice for August and nobody remembers why". -->
<Dialog.Root bind:open={voidOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>{$_('invoices.voidConfirm.title', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>{$_('invoices.voidConfirm.body', { locale: $lang })}</Dialog.Description>
        </Dialog.Header>
        <Input bind:value={voidReason} placeholder={$_('invoices.voidConfirm.reason', { locale: $lang })}/>
        <Dialog.Footer>
            <Button variant="outline" disabled={voiding} on:click={() => (voidOpen = false)}>
                {$_('invoices.cancel', { locale: $lang })}
            </Button>
            <Button variant="destructive" disabled={voiding || voidReason.trim() === ''} on:click={confirmVoid}>
                {#if voiding}
                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                {/if}
                {$_('invoices.void', { locale: $lang })}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
