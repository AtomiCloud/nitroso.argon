import type { Selected } from "bits-ui";

export const WITHDRAWAL_STATUS: Record<string, Selected<string>> = {
  Pending: {
    value: "Pending",
    label: "Pending",
  },
  Completed: {
    value: "Completed",
    label: "Completed",
  },
  Cancel: {
    value: "Cancel",
    label: "Cancelled",
  },
  Rejected: {
    value: "Rejected",
    label: "Rejected",
  },
};

export const WITHDRAWAL_STATUS_BADGE: Record<
  string,
  { color: string; display: string }
> = {
  Pending: {
    color: "bg-yellow-500",
    display: "Pending",
  },
  Completed: {
    color: "bg-green-500",
    display: "Completed",
  },
  Cancel: {
    color: "bg-red-500",
    display: "Cancelled",
  },
  Rejected: {
    color: "bg-red-500",
    display: "Rejected",
  },
};
