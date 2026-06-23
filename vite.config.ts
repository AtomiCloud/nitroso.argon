import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    // Use the forks pool: the default worker-thread pool aborts on teardown in
    // this Nix/macOS dev shell (libuv kqueue assertion on exit).
    pool: 'forks',
  },
});
