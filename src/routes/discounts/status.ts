import type { Selected } from "bits-ui";

export const DISCOUNT_TYPE: Record<string, Selected<string>> = {
  Percentage: {
    value: "Percentage",
    label: "Percentage",
  },
  Flat: {
    value: "Flat",
    label: "Flat",
  },
};

export const DISCOUNT_STATUS: Record<string, Selected<string>> = {
  true: {
    value: "true",
    label: "Disabled",
  },
  false: {
    value: "false",
    label: "Enabled",
  },
};

export const DISCOUNT_MATCH_MODE: Record<string, Selected<string>> = {
  All: {
    value: "All",
    label: "All",
  },
  Any: {
    value: "Any",
    label: "Any",
  },
  None: {
    value: "None",
    label: "None",
  },
};

export const DISCOUNT_MATCH_TYPE: Record<string, Selected<string>> = {
  UserId: {
    value: "UserId",
    label: "UserId",
  },
  Role: {
    value: "Role",
    label: "Role",
  },
};
