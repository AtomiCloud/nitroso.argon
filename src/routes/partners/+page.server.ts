import type { PageServerLoad } from './$types';
import { guardAdmin } from '$lib/server/admin-guard';

// Partners page is admin-only (the zinc endpoints are OnlyAdmin). The nav
// hides the link for non-admins; this guard makes the URL obey the same
// rule. 404 rather than 403 so the page's existence is not advertised.
export const load: PageServerLoad = async ({ parent }) => {
  const { session } = await parent();
  guardAdmin(session);
  return {};
};
