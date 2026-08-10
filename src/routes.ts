export const publicRoutes: string[] = [
  "/",
  "/legacy",
  "/achievements",
  "/blogs",
  "/events",
  "/opportunities",
  "/join",
  "/register",
];

// Patterns for dynamic public routes
export const publicRoutePatterns: RegExp[] = [
  /^\/blogs\/[^/]+$/, // /blogs/:slug
];

export const authRoutes: string[] = ["/signin", "/signup", "/forgot-password"];

export const apiAuthPrefix: string = "/api/auth";

export const DEFAULT_LOGIN_REDIRECT: string = "/";
