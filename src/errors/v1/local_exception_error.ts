import { Problem } from "../problem";

class LocalExceptionError extends Problem {
  constructor(detail: string, error: Error) {
    super(detail);
    this.message = error.message;
    this.type = error.name;
    this.stacktrace = error.stack;
  }

  /**
   * Message
   * @description the message of the error caught
   */
  message: string;

  /**
   * Type
   * @description the name of the error caught
   */
  type: string;

  /**
   * Stacktrace
   * @description the stacktrace of the error caught, if exist
   */
  stacktrace?: string;
}

export { LocalExceptionError };
