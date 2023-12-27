import { Problem } from "../problem";

/**
 * Unauthenticated
 * @description The users is not logged in, and is required to logged in to perform this action
 */
class Unauthorized extends Problem {
  constructor(detail: string, scopeRequired: string[], scopeGranted: string[]) {
    super(detail);
    this.scopeRequired = scopeRequired;
    this.scopeGranted = scopeGranted;
  }

  /**
   * Scope Required
   * @description scope required to perform this action
   */
  scopeRequired: string[];

  /**
   * Scope Granted
   * @description scope granted to the user attempting to perform this action
   */
  scopeGranted: string[];
}

export { Unauthorized };
