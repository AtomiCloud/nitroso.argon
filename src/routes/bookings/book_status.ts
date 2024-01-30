import type { Selected } from "bits-ui";

export const BOOKING_STATUS: Record<
  string,
  Selected<string> & { color: string }
> = {
  Pending: {
    value: "Pending",
    label: "Pending",
    color: "bg-amber-500",
  },
  Buying: {
    value: "Buying",
    label: "Buying",
    color: "bg-blue-500",
  },
  Completed: {
    value: "Completed",
    label: "Completed",
    color: "bg-green-500",
  },
  Cancelled: {
    value: "Cancelled",
    label: "Cancelled",
    color: "bg-red-500",
  },
  Refunded: {
    value: "Refunded",
    label: "Refunded",
    color: "bg-sky-500",
  },
  Terminated: {
    value: "Terminated",
    label: "Terminated",
    color: "bg-red-500",
  },
};
