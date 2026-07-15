import { error } from '@sveltejs/kit';

// Server-side guard for owner-only commercial views. Hiding a navigation
// entry is presentation only; this ensures a direct URL cannot render the
// page for admins who do not carry the owner role. Match the session-role
// convention used throughout Argon and return 404 to avoid advertising it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function guardOwner(session: any): void {
  if (!session?.roles?.includes('owner')) throw error(404, 'Not Found');
}
