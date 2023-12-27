import { Problem } from "../problem";

class LocalUnknownError extends Problem {
  constructor(detail: string, error: unknown) {
    super(detail);
    this.error = JSON.stringify(error);
  }

  /**
   * Error
   * @description the local error is catch with a try-catch block serialized as string
   */
  error: string;
}

export { LocalUnknownError };
