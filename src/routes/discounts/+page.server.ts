import type { PageServerLoad } from './$types';
import { guardAdmin } from '$lib/server/admin-guard';

export const load: PageServerLoad = async ({ parent }) => {
  const { session } = await parent();
  guardAdmin(session);
  return {};
};
