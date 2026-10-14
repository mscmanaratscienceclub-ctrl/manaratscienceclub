import type { Metadata } from "next";
import RegistrationClosedNotice from "@/components/site/registration-closed-notice";

export const metadata: Metadata = {
  title: "Registration Closed — STEM Fest",
  description:
    "Registration for the Manarat Science Club STEM Fest events and the volunteer application are now closed. Thank you for your interest.",
};

export default function RegisterPage() {
  return <RegistrationClosedNotice />;
}
