import type { Problem } from "./problem";

interface ProblemDetails {
  type: string;
  title: string;
  detail: string;
  status: number;
  traceId: string;
  data: Problem;
}

export type { ProblemDetails };
