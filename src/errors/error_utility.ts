import { config } from "../config/shared";
import type { ProblemDetails } from "./problem_details";
import type { ProblemConstructor } from "./error_info";
import { problems } from "./error_info";
import type { Problem } from "./problem";

const ep = config.errorPortal;
const ap = config.app;

function toDetail<T extends Problem>(problem: T): ProblemDetails {
  const errorInfo = problems.get(problem.constructor as ProblemConstructor);
  if (errorInfo == null) {
    return {
      detail: "Error parsed not registered",
      title: "Error occurred when parsing Error",
      status: 500,
      traceId: "local",
      type: "none",
      data: {
        original: problem,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }
  const p: T = JSON.parse(JSON.stringify(problem));

  return {
    detail: problem.detail,
    title: errorInfo.title,
    status: errorInfo.status,
    traceId: "local",
    type: `${ep.scheme}://${ep.host}/docs/${ap.landscape}/${ap.platform}/${ap.service}/${ap.module}/${errorInfo.version}/${errorInfo.id}`,
    data: p,
  };
}

export { toDetail };
