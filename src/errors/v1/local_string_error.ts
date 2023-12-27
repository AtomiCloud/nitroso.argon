import { Problem } from "../problem";

class LocalStringError extends Problem {
  constructor(detail: string, error: string) {
    super(detail);
    this.error = error;
  }

  /**
   * Error
   * @description the local error is catch with a try-catch block
   */
  error: string;
}

export { LocalStringError };
