import type { PageServerLoad } from './$types';
import { guardAdmin } from '$lib/server/admin-guard';
import { guardOwner } from '$lib/server/owner-guard';

// Partner commercial data requires the existing admin gate plus the narrower
// owner role. The nav applies both; these guards make a direct URL obey the
// same rule. 404 rather than 403 so the page's existence is not advertised.
export const load: PageServerLoad = async ({ parent }) => {
  const { session } = await parent();
  guardAdmin(session);
  guardOwner(session);
  return {};
};
