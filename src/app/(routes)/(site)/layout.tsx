import Nav from "@/components/nav";
import Footer from "@/components/footer";
import RegistrationExtendedBanner from "@/components/site/registration-extended-banner";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-space-deep font-space-body text-space-ivory">
      <RegistrationExtendedBanner />
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
