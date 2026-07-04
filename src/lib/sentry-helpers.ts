import * as Sentry from "@sentry/nextjs";

export type SentryUser = {
  id: string;
  username?: string;
  email?: string;
};

/**
 * Capture an exception with optional extra context.
 * Safe to call when Sentry is not configured (SDK no-ops on missing DSN).
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture a message with an optional severity level.
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
): void {
  Sentry.captureMessage(message, level);
}

/**
 * Set the current user context for Sentry events.
 */
export function setSentryUser(user: SentryUser): void {
  Sentry.setUser({ id: user.id, username: user.username, email: user.email });
}

/**
 * Clear the user context (e.g. on sign-out).
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}
