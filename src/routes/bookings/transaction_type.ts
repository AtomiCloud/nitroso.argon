import type { Selected } from "bits-ui";

export const BOOKING_STATUS: Record<string, Selected<string>> = {
  Pending: {
    value: "Pending",
    label: "Pending",
  },
  Buying: {
    value: "Buying",
    label: "Buying",
  },
  Completed: {
    value: "Completed",
    label: "Completed",
  },
  Cancelled: {
    value: "Cancelled",
    label: "Cancelled",
  },
  Refunded: {
    value: "Refunded",
    label: "Refunded",
  },
  Terminated: {
    value: "Terminated",
    label: "Terminated",
  },
};
