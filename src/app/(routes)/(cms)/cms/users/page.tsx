import { getAllUsers } from "@/lib/actions/users";
import UsersTable from "./users-table";

export default async function UsersPage() {
  const users = await getAllUsers();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">
          User Management
        </h1>
        <p className="mt-2 font-body text-ink/60">
          Manage team members and assign roles to control access across the CMS.
        </p>
      </div>

      {/* Users Table */}
      <UsersTable users={users} />
    </div>
  );
}
