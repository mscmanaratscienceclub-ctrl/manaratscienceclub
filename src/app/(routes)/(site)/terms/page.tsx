import LegalShell, { type LegalSection } from "@/components/site/legal-shell";
import { siteConfig } from "@/lib/data";

export const metadata = {
  title: "Terms of Service | Manarat Science Club",
  description: `The terms that govern use of the ${siteConfig.name} website.`,
};

const UPDATED = "August 20, 2026";

const sections: LegalSection[] = [
  {
    heading: "Acceptance of terms",
    paragraphs: [
      `By accessing or using the ${siteConfig.name} website, you agree to these Terms of Service and to our Privacy Policy. If you do not agree, please do not use the site.`,
    ],
  },
  {
    heading: "Using the site",
    list: [
      "Use the site for lawful purposes connected to the club's educational and scientific activities.",
      "Do not attempt to access data, accounts, or systems that do not belong to you.",
      "Do not submit false information, spam forms, or content that is harmful or disrespectful.",
    ],
  },
  {
    heading: "Registrations and applications",
    paragraphs: [
      "When you submit a registration or application form, you confirm that the information you provide is accurate and belongs to you. Selection decisions for programmes such as the Campus Ambassador initiative or future science competitions are made by the club's committee and are final.",
    ],
  },
  {
    heading: "Accounts",
    paragraphs: [
      "If you create an account, you are responsible for keeping your credentials private and for activity that occurs under it. Let us know immediately if you believe your account has been compromised.",
    ],
  },
  {
    heading: "Content and intellectual property",
    paragraphs: [
      `The website's design, text, and media are owned by ${siteConfig.name} or used with permission, and may not be reproduced without consent. By submitting content to us (such as form responses or event entries), you grant the club a non-exclusive right to display and reference that content in club communications and showcases.`,
    ],
  },
  {
    heading: "Third-party links and communities",
    paragraphs: [
      "The site links to external platforms such as Discord, WhatsApp, Facebook, and Instagram. Those platforms have their own rules and privacy practices, and we are not responsible for what happens on them.",
    ],
  },
  {
    heading: "Disclaimers and liability",
    paragraphs: [
      "The site is provided \"as is\" without warranties of any kind. To the maximum extent permitted by law, the club is not liable for indirect or incidental damages arising from use of the site. Event schedules and programme details may change without notice.",
    ],
  },
  {
    heading: "Changes to these terms",
    paragraphs: [
      "We may revise these terms from time to time. Continued use of the site after changes are published counts as acceptance of the updated terms.",
    ],
  },
  {
    heading: "Governing law",
    paragraphs: [
      "These terms are governed by the laws of the People's Republic of Bangladesh.",
    ],
  },
  {
    heading: "Contact",
    paragraphs: [
      `For questions about these terms, contact ${siteConfig.email} or write to ${siteConfig.address}.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalShell
      kicker="MSC Legal"
      title="Terms of Service"
      updated={UPDATED}
      intro={`These terms govern your use of the ${siteConfig.name} website, including its forms, events, and community links.`}
      sections={sections}
    />
  );
}
