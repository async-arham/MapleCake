export type AppErrorCode = "NOT_FOUND" | "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "RATE_LIMITED";

/** An error whose message is safe to show to the person using the app. */
export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
