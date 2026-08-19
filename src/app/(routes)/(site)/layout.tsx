import Nav from "@/components/nav";
import Footer from "@/components/footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-space-deep font-space-body text-space-ivory">
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
