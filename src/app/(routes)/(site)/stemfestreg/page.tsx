import type { Metadata } from "next";
import RegistrationClosedNotice from "@/components/site/registration-closed-notice";

export const metadata: Metadata = {
  title: "Registration Closed — STEM Fest",
  description:
    "STEM Fest event registration is now closed. Thank you for your interest in the Manarat Science Club.",
};

/**
 * The path stays live rather than 404ing: it carries the printed flyer URL and
 * the hero CTA, so anyone arriving here is told the outcome rather than bounced.
 */
export default function StemfestRegistrationPage() {
  return <RegistrationClosedNotice />;
}
