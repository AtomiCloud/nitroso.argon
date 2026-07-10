import type { ProblemDetails } from '../../errors/problem_details';
import type {
  CostPolicyPrincipalRes,
  CostPrincipalRes,
  PriorityAccessRes,
  PrioritySettingsRes,
  TimingRes,
} from '$lib/api/core/data-contracts';
import { NewApi } from '../../store';
import { toResult } from '$lib/utility';
import { loadError } from '$lib/i18n';
import { Res } from '$lib/core/result';
import type { PageLoad } from './$types';

export type CostsPageOk = [
  CostPrincipalRes[],
  CostPolicyPrincipalRes[],
  PrioritySettingsRes,
  PriorityAccessRes[],
  TimingRes,
  TimingRes,
];

export const load = (async ({
  parent,
  fetch,
}): Promise<{
  result: ['err', ProblemDetails[]] | ['ok', CostsPageOk];
}> => {
  const { session, locale } = await parent();

  const api = NewApi({ data: { session }, fetch });

  const costs = toResult(() => api.vCostDetail('1'), await loadError(locale, 'errors.load.costs'));
  const policies = toResult(() => api.vCostPoliciesDetail('1'), await loadError(locale, 'errors.load.policies'));
  const settings = toResult(
    () => api.vBookingPrioritySettingsDetail('1'),
    await loadError(locale, 'errors.load.priority'),
  );
  const access = toResult(() => api.vBookingPriorityAccessDetail('1'), await loadError(locale, 'errors.load.priority'));
  const timingsJToW = toResult(() => api.vTimingDetail('JToW', '1'), await loadError(locale, 'errors.load.timing'));
  const timingsWToJ = toResult(() => api.vTimingDetail('WToJ', '1'), await loadError(locale, 'errors.load.timing'));

  const result = await Res.all(costs, policies, settings, access, timingsJToW, timingsWToJ).serial();

  return {
    result,
  };
}) satisfies PageLoad;
