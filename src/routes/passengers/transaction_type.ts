import type { Selected } from "bits-ui";

export const TRANSACTION_TYPES: Record<string, Selected<string>> = {
  BookingRequest: {
    value: "BookingRequest",
    label: "Booking Request",
  },
  BookingComplete: {
    value: "BookingComplete",
    label: "Booking Complete",
  },
  BookingCancel: {
    value: "BookingCancel",
    label: "Booking Cancel",
  },
  BookingRefund: {
    value: "BookingRefund",
    label: "Booking Refund",
  },
  BookingTerminated: {
    value: "BookingTerminated",
    label: "Booking Terminated",
  },
  Deposit: {
    value: "Deposit",
    label: "Deposit",
  },
  WithdrawRequest: {
    value: "WithdrawRequest",
    label: "Withdraw Request",
  },
  WithdrawComplete: {
    value: "WithdrawComplete",
    label: "Withdraw Complete",
  },
  WithdrawCancelled: {
    value: "WithdrawCancelled",
    label: "Withdraw Cancelled",
  },
  WithdrawRejected: {
    value: "WithdrawRejected",
    label: "Withdraw Rejected",
  },

  Promotional: {
    value: "Promotional",
    label: "Promotional",
  },
  Transfer: {
    value: "Transfer",
    label: "Transfer",
  },
};
