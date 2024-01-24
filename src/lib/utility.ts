import { LocalStringError } from "../errors/v1/local_string_error";
import { LocalExceptionError } from "../errors/v1/local_exception_error";
import { LocalUnknownError } from "../errors/v1/local_unknown_error";
import type { Problem } from "../errors/problem";
import type { HttpResponse } from "$lib/api/core/http-client";
import type { Result } from "$lib/core/result";
import { Err, Ok, Res } from "$lib/core/result";
import type { ProblemDetails } from "../errors/problem_details";
import { toDetail } from "../errors/error_utility";
import { jwtDecode } from "jwt-decode";

const isResponse = <T>(value: unknown): value is HttpResponse<T> => {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    "ok" in value &&
    "data" in value
  );
};

const isProblem = (value: unknown): value is Problem => {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    "status" in value
  );
};

const isProblemDetail = (value: unknown): value is ProblemDetails => {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "title" in value &&
    "type" in value
  );
};

function pathMatch(pathParts: string[], pattern: string[]) {
  return (
    pathParts.length === pattern.length &&
    pathParts.every(
      (part, index) => pattern[index] === "*" || pattern[index] === part,
    )
  );
}

function toResult<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  f: () => Promise<HttpResponse<T, any>>,
  localErrorDetail: string,
): Result<T, ProblemDetails> {
  return Res.async(async () => {
    try {
      const r = await f();
      if (r.ok) return Ok(r.data);
      const problem = await parseErrorResponse(r, "HTTP Client Error");
      return Err(problem);
    } catch (e) {
      if (isResponse(e)) {
        const problem = await parseErrorResponse(e, "HTTP Client Error");
        return Err(problem);
      }
      const p = parseError(localErrorDetail, e);
      return Err(toDetail(p));
    }
  });
}

async function parseErrorResponse<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  r: HttpResponse<T, any>,
  error?: string,
): Promise<ProblemDetails> {
  if (r.error == null) {
    try {
      const t = (await r.text()) ?? "No body found";
      return toDetail(new LocalStringError(error ?? "Unknown client error", t));
    } catch (e) {
      return toDetail(
        new LocalStringError(error ?? "Unknown client error", r.statusText),
      );
    }
  }

  return parseErrorToDetail("Unknown client error", r.error);
}

function parseErrorToDetail(detail: string, error: unknown): ProblemDetails {
  if (isProblemDetail(error)) return error;
  return toDetail(parseError(detail, error));
}

function parseError(detail: string, error: unknown): Problem {
  if (error instanceof Error) {
    return new LocalExceptionError(detail, error);
  } else if (typeof error === "string") {
    return new LocalStringError(detail, error);
  } else if (isProblem(error)) {
    return error;
  } else {
    return new LocalUnknownError(detail, error);
  }
}

function expired(token?: string, now?: Date): boolean {
  if (now == null) now = new Date();
  if (token == null) return true;
  const d = jwtDecode(token) as { exp: number };
  return d.exp * 1000 < now.getTime();
}

function unique<T>(value: T, index: number, array: T[]): boolean {
  return array.indexOf(value) === index;
}

const __ = (i: number) =>
  new Promise((resolve) => setTimeout(resolve, i * 1000));

function compare(a?: string | null, b?: string | null): boolean {
  if (a == null || b == null) return false;
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x.includes(y) || y.includes(x);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

export {
  noop,
  compare,
  unique,
  __,
  expired,
  toResult,
  pathMatch,
  toDetail,
  isProblemDetail,
  parseErrorToDetail,
  isProblem,
  isResponse,
  parseError,
};
