import { error } from '@sveltejs/kit';

// Server-side guard for admin-only pages. The nav only HIDES the links for
// non-admins — without this, anyone could open the page shell by URL (the
// data calls fail, but the UI itself must not render either). 404 rather
// than 403 so the pages' existence is not advertised.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function guardAdmin(session: any): void {
  if (!session?.roles?.includes('admin')) throw error(404, 'Not Found');
}
