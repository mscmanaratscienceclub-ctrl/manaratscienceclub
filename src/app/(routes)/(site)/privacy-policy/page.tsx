import LegalShell, { type LegalSection } from "@/components/site/legal-shell";
import { siteConfig } from "@/lib/data";

export const metadata = {
  title: "Privacy Policy | Manarat Science Club",
  description: `How ${siteConfig.name} collects, uses, and protects your information.`,
};

const UPDATED = "August 20, 2026";

const sections: LegalSection[] = [
  {
    heading: "Information we collect",
    paragraphs: [
      "We only collect information you choose to give us or that is needed to keep the site running:",
    ],
    list: [
      "Form submissions — details you enter into registration forms, such as the Campus Ambassador, Batch Ambassador and Volunteer forms (name, class, school, and your written responses).",
      "Account data — if you create an MSC account, we store your name, email address, username, and a securely hashed password.",
      "Usage data — anonymised analytics (such as page views) that help us understand which parts of the site are useful.",
      "Local drafts — registration forms may save unfinished answers in your own browser's local storage so you can resume later; this data never leaves your device.",
    ],
  },
  {
    heading: "How we use your information",
    list: [
      "To review applications and registrations for club programmes, events, and competitions.",
      "To contact you about the status of your application or about events you signed up for.",
      "To operate and improve the website, including fixing problems and planning future activities.",
      "To keep the site safe and prevent misuse.",
    ],
  },
  {
    heading: "Storage and security",
    paragraphs: [
      `Registration and account data is stored in a PostgreSQL database hosted on Supabase, with access restricted to authorised ${siteConfig.name} administrators. Passwords are hashed and never stored in plain text. While we take reasonable technical care, no method of transmission over the internet is completely secure.`,
    ],
  },
  {
    heading: "Sharing",
    paragraphs: [
      "We do not sell, rent, or trade your personal information. Submission details may be shared internally with club faculty advisors, event judges, or school administration solely to run club programmes, or where we are required to by law.",
    ],
  },
  {
    heading: "Cookies and analytics",
    paragraphs: [
      "The site uses essential cookies to keep you signed in and may use privacy-friendly analytics cookies to measure aggregate usage. You can disable cookies in your browser settings; essential sign-in features may stop working if you do.",
    ],
  },
  {
    heading: "Your rights",
    paragraphs: [
      `You may ask us what information we hold about you, request corrections, or ask for it to be deleted. Email ${siteConfig.email} from the address you used when submitting, and we will respond within a reasonable time.`,
    ],
  },
  {
    heading: "Students and minors",
    paragraphs: [
      "This website is intended for students of Manarat Dhaka International School & College and similar academic communities. If a minor submits information without guardian awareness, a guardian may contact us to have it removed.",
    ],
  },
  {
    heading: "Changes to this policy",
    paragraphs: [
      "We may update this policy as the site grows. The latest version will always be published on this page with a revised date.",
    ],
  },
  {
    heading: "Contact",
    paragraphs: [
      `Questions about privacy can be sent to ${siteConfig.email}, or by post to ${siteConfig.address}.`,
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalShell
      kicker="MSC Legal"
      title="Privacy Policy"
      updated={UPDATED}
      intro={`This policy explains what information ${siteConfig.name} ("MSC", "we") collects through this website, why we collect it, and how we look after it.`}
      sections={sections}
    />
  );
}
