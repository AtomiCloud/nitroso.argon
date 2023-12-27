import { Problem } from "../problem";

/**
 * Unauthenticated
 * @description The users is not logged in, and is required to logged in to perform this action
 */
class AggregatedError extends Problem {
  constructor(detail: string, subErrors: Problem[]) {
    super(detail);
    this.innerErrors = subErrors;
  }

  /**
   * @description the actual errors
   */
  innerErrors: Problem[];
}

export { AggregatedError };
