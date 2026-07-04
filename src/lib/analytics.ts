export type AnalyticsEvent =
  | "user_signed_in"
  | "user_signed_up"
  | "user_signed_out"
  | "post_published"
  | "post_updated"
  | "post_deleted"
  | "user_role_changed"
  | "file_uploaded"
  | "file_upload_failed";

export function trackEvent(
  _event: AnalyticsEvent,
  _properties?: Record<string, unknown>,
): void {
}

export function identifyUser(_user: {
  id: string;
  username?: string;
  email?: string;
}): void {
}

export function resetAnalytics(): void {
}
