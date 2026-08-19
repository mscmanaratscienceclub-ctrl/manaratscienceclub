"use client";

import { usePathname } from "next/navigation";

import SignalNav from "@/components/home/signal-nav";

export default function Nav() {
  const pathname = usePathname();

  return <SignalNav variant={pathname === "/" ? "overlay" : "bar"} />;
}
