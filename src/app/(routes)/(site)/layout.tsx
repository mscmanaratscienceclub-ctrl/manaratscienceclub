import Nav from "@/components/nav";
import Footer from "@/components/footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
