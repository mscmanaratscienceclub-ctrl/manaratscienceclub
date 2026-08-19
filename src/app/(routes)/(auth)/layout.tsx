import Nav from "@/components/nav";
import Footer from "@/components/footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-space-deep font-space-body text-space-ivory">
      <div aria-hidden="true" className="signal-atmosphere pointer-events-none absolute inset-0" />
      <Nav />
      <main className="relative flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}
