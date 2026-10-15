"use client";

import { createContext, useContext } from "react";

/**
 * Who is signed in, on the client.
 *
 * The browser cache is stamped with the admin whose session produced it, so a leaf
 * that reads a cached participant list has to be able to ask "is this still mine?" —
 * a fest laptop is shared, and one browser's IndexedDB must not hand the next admin
 * someone else's rows. The layout already read the session to render the rail, so the
 * address is published from there rather than re-read by every page that wants it.
 */
const AdminEmailContext = createContext<string | null>(null);

export function AdminEmailProvider({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <AdminEmailContext.Provider value={email}>{children}</AdminEmailContext.Provider>
  );
}

/**
 * The signed-in admin's address, or `null` outside the panel.
 *
 * `null` means "do not touch the cache" rather than "the cache is empty": the
 * admin-preview route renders the same chrome against a fixture user, and a preview
 * must never read or write a real participant list.
 */
export function useAdminEmail(): string | null {
  return useContext(AdminEmailContext);
}
