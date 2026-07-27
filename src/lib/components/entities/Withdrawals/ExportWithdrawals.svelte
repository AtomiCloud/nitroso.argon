<script lang="ts">
    import {Button} from "$lib/components/ui/button";
    import {Download, LucideLoader} from "lucide-svelte";
    import {toast} from "svelte-sonner";
    import {page} from "$app/stores";
    import {signIn} from "@auth/sveltekit/client";
    import {expired} from "$lib/utility";
    import {config} from "../../../../config/shared";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";
    import {
        requestWithdrawalExport,
        triggerBlobDownload,
        type WithdrawalExportFilters,
    } from "./withdrawal-export";

    /**
     * The server-side filters currently applied on the withdrawals page, in
     * the zinc casing `vWithdrawalDetail` uses. Limit/Skip are absent because
     * the export is never paginated.
     */
    export let filters: WithdrawalExportFilters = {};

    let exporting = false;

    /**
     * The generated client is typed for JSON responses, so this route (which
     * returns `text/csv` with a `Content-Disposition` attachment) is fetched
     * by hand. The bearer matches `NewApi`'s securityWorker in
     * `../../../../store`; because this is a browser action, an unusable token
     * follows the shared client-side API behavior and starts re-authentication.
     */
    async function exportCsv() {
        // The disabled button prevents ordinary repeat clicks, while this
        // synchronous guard also covers events queued before Svelte flushes.
        if (exporting) return;
        exporting = true;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const session: any = $page.data.session;
            if (session?.access_token == null || expired(session.access_token, new Date())) {
                await signIn("descope");
                return;
            }

            const result = await requestWithdrawalExport({
                baseUrl: `${config.api.scheme}://${config.api.domain}`,
                filters,
                accessToken: session.access_token,
                messages: {
                    forbidden: $_('withdrawals.export.forbidden', { locale: $lang }),
                    unavailable: $_('withdrawals.export.unavailable', { locale: $lang }),
                    failed: $_('withdrawals.export.failed', { locale: $lang }),
                },
                fetch,
                download: triggerDownload,
            });
            if (result.ok === false) toast.error(result.message);
        } catch (e) {
            // Network-level failure (offline, DNS, CORS) — `fetch` rejects
            // before there is any response to read a problem out of.
            console.error(e);
            toast.error($_('withdrawals.export.failed', { locale: $lang }));
        } finally {
            exporting = false;
        }
    }

    function triggerDownload(blob: Blob, name: string) {
        triggerBlobDownload(blob, name, {
            createObjectURL: URL.createObjectURL,
            revokeObjectURL: URL.revokeObjectURL,
            createAnchor: () => document.createElement("a"),
            append: (anchor) => document.body.append(anchor as HTMLAnchorElement),
            defer: (callback, delayMs) => setTimeout(callback, delayMs),
        });
    }
</script>

<Button variant="outline" class="w-full lg:max-w-60" on:click={exportCsv} disabled={exporting}>
    {#if exporting}
        <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
    {:else}
        <Download class="mr-2 h-4 w-4"/>
    {/if}
    {exporting
        ? $_('withdrawals.export.exporting', { locale: $lang })
        : $_('withdrawals.export.trigger', { locale: $lang })}
</Button>
