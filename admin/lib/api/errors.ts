/**
 * Shared API error type.
 *
 * This lives in its own module because `config.ts` needs it to report a missing
 * backend URL, and `client.ts` needs `getApiBaseUrl()` from `config.ts`. Keeping
 * both in one pair of files made `config.ts <-> client.ts` a circular import, so
 * whichever module was evaluated first could observe `ApiError` as an
 * uninitialised binding — turning a misconfigured URL into a
 * "ApiError is not a constructor" crash instead of a clear configuration error.
 */
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}
