import type { Metadata } from "next";
import RegistrationClosedNotice from "@/components/site/registration-closed-notice";

export const metadata: Metadata = {
  title: "Volunteer Applications Closed — STEM Fest",
  description:
    "Volunteer applications for the Manarat Science Club STEM Fest are now closed. Thank you for your interest.",
};

export default function VolunteerPage() {
  return <RegistrationClosedNotice />;
}
