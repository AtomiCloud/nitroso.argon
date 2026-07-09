import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: [vitePreprocess({})],

  kit: {
    // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
    // If your environment is not supported or you settled on a specific environment, switch out the adapter.
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    adapter: adapter(),
    // Poll version.json so long-lived tabs learn a new build was deployed.
    // Each deploy replaces the hashed immutable chunks, so a stale client's
    // dynamic imports fail ("Failed to fetch dynamically imported module")
    // unless it full-reloads — see the beforeNavigate hook in +layout.svelte.
    version: {
      pollInterval: 60_000,
    },
  },
};

export default config;
