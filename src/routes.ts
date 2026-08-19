export const publicRoutes: string[] = [
  "/",
  "/legacy",
  "/achievements",
  "/blogs",
  "/events",
  "/opportunities",
  "/join",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

// Patterns for dynamic public routes
export const publicRoutePatterns: RegExp[] = [
  /^\/blogs\/[^/]+$/, // /blogs/:slug
];

export const authRoutes: string[] = ["/signin", "/signup"];

export const apiAuthPrefix: string = "/api/auth";

export const DEFAULT_LOGIN_REDIRECT: string = "/";
