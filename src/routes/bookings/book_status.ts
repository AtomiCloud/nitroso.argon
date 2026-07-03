import type { Selected } from 'bits-ui';

export const BOOKING_STATUS: Record<string, Selected<string> & { color: string }> = {
  Pending: {
    value: 'Pending',
    label: 'Pending',
    color: 'bg-amber-500',
  },
  Buying: {
    value: 'Buying',
    label: 'Buying',
    color: 'bg-blue-500',
  },
  Completed: {
    value: 'Completed',
    label: 'Completed',
    color: 'bg-green-500',
  },
  Cancelled: {
    value: 'Cancelled',
    label: 'Cancelled',
    color: 'bg-red-500',
  },
  Refunded: {
    value: 'Refunded',
    label: 'Refunded',
    color: 'bg-sky-500',
  },
  Terminated: {
    value: 'Terminated',
    label: 'Terminated',
    color: 'bg-red-500',
  },
  Recovering: {
    value: 'Recovering',
    label: 'Recovering',
    color: 'bg-orange-500',
  },
  Duplicate: {
    value: 'Duplicate',
    label: 'Duplicate',
    color: 'bg-purple-500',
  },
  RequireManualIntervention: {
    value: 'RequireManualIntervention',
    label: 'RequireManualIntervention',
    color: 'bg-rose-600',
  },
};
