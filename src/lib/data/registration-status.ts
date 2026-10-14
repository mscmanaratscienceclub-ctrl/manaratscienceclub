/**
 * One switch for the end of STEM Fest intake.
 *
 * Read by the three registration surfaces (`/register`, `/stemfestreg`,
 * `/volunteer`) so they render the closed notice instead of a form, and by both
 * submit actions so a browser still holding an open form cannot insert. Flip
 * `registrationIsClosed` back to `false` to reopen every surface at once.
 */
export const registrationIsClosed: boolean = true;

/** The notice itself, shared by all three closed pages. */
export const registrationClosedNotice = {
  eyebrow: "Registration",
  heading: "Registration is closed",
  message:
    "Thank you for your interest. STEM Fest registration and volunteer applications are now closed, and no new entries are being accepted.",
  ctaLabel: "Read about the STEM Fest",
  href: "/details",
} as const;

/** Replaces the site-wide "Registration extended" strip while intake is closed. */
export const registrationClosedBanner = {
  label: "Registration closed",
  message:
    "STEM Fest registration and volunteer applications are closed. Thank you for your interest.",
} as const;

/** Returned by both submit actions when a stale form is submitted anyway. */
export const registrationClosedError =
  "Registration is closed. Thank you for your interest.";
