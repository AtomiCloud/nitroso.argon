import { Unauthenticated } from "./v1/unauthenticated";
import type { Problem } from "./problem";
import { LocalExceptionError } from "./v1/local_exception_error";
import { LocalStringError } from "./v1/local_string_error";
import { LocalUnknownError } from "./v1/local_unknown_error";
import { Unauthorized } from "./v1/unauthorized";
import { AggregatedError } from "./v1/aggregate_error";

interface ErrorInfoResp {
  id: string;
  title: string;
  version: string;
  schema: object;
}

interface ProblemConstructor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...input: any[]): Problem;
}

interface ErrorRegistryEntry {
  id: string;
  title: string;
  version: string;
  schema: object;
  status: number;
  type: ProblemConstructor;
}

const problems: Map<ProblemConstructor, ErrorRegistryEntry> = new Map<
  ProblemConstructor,
  ErrorRegistryEntry
>([
  [
    AggregatedError,
    {
      id: "email_not_verified",
      title: "Email Not Verified",
      version: "v1",
      schema: {},
      status: 403,
      type: AggregatedError,
    },
  ],
  [
    LocalExceptionError,
    {
      id: "local_exception_error",
      title: "Client Error",
      version: "v1",
      schema: {},
      status: 400,
      type: LocalExceptionError,
    },
  ],
  [
    LocalStringError,
    {
      id: "local_string_error",
      title: "Client Error",
      version: "v1",
      schema: {},
      status: 400,
      type: LocalStringError,
    },
  ],
  [
    LocalUnknownError,
    {
      id: "local_unknown_error",
      title: "Unknown Error",
      version: "v1",
      schema: {},
      status: 400,
      type: LocalUnknownError,
    },
  ],
  [
    Unauthenticated,
    {
      id: "unauthenticated",
      title: "Not Authenticated",
      version: "v1",
      schema: {},
      status: 401,
      type: Unauthenticated,
    },
  ],
  [
    Unauthorized,
    {
      id: "unauthorized",
      title: "Unauthorized",
      version: "v1",
      schema: {},
      status: 403,
      type: Unauthorized,
    },
  ],
]);

export { problems };
export type { ErrorInfoResp, ErrorRegistryEntry, ProblemConstructor };
