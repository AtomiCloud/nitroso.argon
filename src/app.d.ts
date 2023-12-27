// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface Platform {}
  }
}

interface Tokens {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
}

declare module "@auth/core/types" {
  interface Session {
    access_token?: string;
    scopes?: string[];
    roles?: string[];
    permissions?: string[];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    scopes: string[];
    roles: string[];
    permissions: string[];
    raw?: Tokens;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error?: any;
  }
}

export {};
