import { Problem } from "../problem";

/**
 * Unauthenticated
 * @description The users is not logged in, and is required to logged in to perform this action
 */
class Unauthenticated extends Problem {
  constructor(detail: string) {
    super(detail);
  }
}

export { Unauthenticated };
