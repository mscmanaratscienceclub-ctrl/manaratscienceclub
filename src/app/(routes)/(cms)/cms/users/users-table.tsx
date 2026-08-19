"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shield, PenSquare, User } from "lucide-react";
import { updateUserRole } from "@/lib/actions/users";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: string;
  createdAt: Date | null;
}

interface UsersTableProps {
  users: UserRow[];
}

const roleConfig: Record<string, { icon: typeof Shield; colorClass: string; bgClass: string }> = {
  admin: {
    icon: Shield,
    colorClass: "text-manara-purple",
    bgClass: "bg-manara-purple/10",
  },
  writer: {
    icon: PenSquare,
    colorClass: "text-manara-teal",
    bgClass: "bg-manara-teal/10",
  },
  member: {
    icon: User,
    colorClass: "text-gray-500",
    bgClass: "bg-gray-100",
  },
};

type UserRole = "admin" | "writer" | "member";

function isUserRole(value: string): value is UserRole {
  return value === "admin" || value === "writer" || value === "member";
}

// Hoist formatter to avoid re-instantiation in loops
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return dateFormatter.format(new Date(date));
}

export default function UsersTable({ users }: UsersTableProps) {
  const router = useRouter();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRoleChange(userId: string, newRole: string) {
    if (!isUserRole(newRole)) return;

    setPendingUserId(userId);
    startTransition(async () => {
      try {
        await updateUserRole(userId, newRole);
        toast.success("Role updated successfully");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update role"
        );
      } finally {
        setPendingUserId(null);
      }
    });
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-manara-teal/10 shadow-subtle">
      <table className="w-full text-left font-body">
        <thead>
          <tr className="border-b border-manara-teal/10 bg-cream/60">
            <th className="px-6 py-4 text-sm font-semibold text-ink/70">
              Name
            </th>
            <th className="px-6 py-4 text-sm font-semibold text-ink/70">
              Username
            </th>
            <th className="px-6 py-4 text-sm font-semibold text-ink/70">
              Role
            </th>
            <th className="px-6 py-4 text-sm font-semibold text-ink/70">
              Joined
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-manara-teal/5">
          {users.map((user) => {
            const config = roleConfig[user.role] ?? roleConfig.member;
            const Icon = config.icon;
            const isThisPending = isPending && pendingUserId === user.id;

            return (
              <tr
                key={user.id}
                className="transition-colors hover:bg-cream/40"
              >
                {/* Name + Email */}
                <td className="px-6 py-4">
                  <div className="font-medium text-ink">{user.name}</div>
                  <div className="mt-0.5 text-sm text-ink/50">{user.email}</div>
                </td>

                {/* Username */}
                <td className="px-6 py-4 text-sm text-ink/70">
                  {user.username ?? "—"}
                </td>

                {/* Role */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                        config.bgClass,
                        config.colorClass
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {user.role}
                    </span>

                    <select
                      value={user.role}
                      disabled={isThisPending}
                      onChange={(e) =>
                        handleRoleChange(user.id, e.target.value)
                      }
                      className={cn(
                        "rounded-lg border border-manara-teal/15 bg-surface px-2 py-1 text-xs text-ink/70 outline-none transition-opacity focus:border-manara-teal focus:ring-1 focus:ring-manara-teal/30",
                        isThisPending && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <option value="admin">admin</option>
                      <option value="writer">writer</option>
                      <option value="member">member</option>
                    </select>
                  </div>
                </td>

                {/* Joined */}
                <td className="px-6 py-4 text-sm text-ink/60">
                  {formatDate(user.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-ink/40">
          <User className="mb-3 h-10 w-10" />
          <p className="font-body text-sm">No users found</p>
        </div>
      )}
    </div>
  );
}
