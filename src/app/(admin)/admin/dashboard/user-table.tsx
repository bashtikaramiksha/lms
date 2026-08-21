"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Search, Filter, CheckCircle2, XCircle, Ban, RefreshCw, Shield, GraduationCap, User, Loader2 } from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  status: "ACTIVE" | "PENDING_APPROVAL" | "SUSPENDED" | "REJECTED";
  emailVerified: boolean | null;
  createdAt: string | null;
}

export function AdminUserTable({ initialUsers }: { initialUsers: UserItem[] }) {
  const [usersList, setUsersList] = useState<UserItem[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (userId: string, update: { status?: string; role?: string }) => {
    setLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });

      const data = await res.json();
      if (res.ok && data.data?.user) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, ...data.data.user } : u))
        );
      } else {
        alert(data.error?.message || "Failed to update user.");
      }
    } catch (err) {
      alert("Error updating user.");
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = usersList.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.fullName.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-border/40">
      {/* Table Toolbar */}
      <div className="p-6 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-border text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-border text-sm text-foreground focus:outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="TEACHER">Teacher</option>
            <option value="STUDENT">Student</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-border text-sm text-foreground focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Verified</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  No users found matching the filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-foreground">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : user.role === "TEACHER"
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {user.role === "ADMIN" && <Shield className="h-3 w-3" />}
                      {user.role === "TEACHER" && <GraduationCap className="h-3 w-3" />}
                      {user.role === "STUDENT" && <User className="h-3 w-3" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : user.status === "PENDING_APPROVAL"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-destructive/10 text-destructive border border-destructive/20"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.emailVerified ? (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5" /> No
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {loadingId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin inline text-primary" />
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        {user.role === "TEACHER" && user.status === "PENDING_APPROVAL" && (
                          <>
                            <button
                              onClick={() => handleAction(user.id, { status: "ACTIVE" })}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(user.id, { status: "REJECTED" })}
                              className="px-2.5 py-1 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive text-xs font-semibold transition-all"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {user.status === "ACTIVE" && user.role !== "ADMIN" && (
                          <button
                            onClick={() => handleAction(user.id, { status: "SUSPENDED" })}
                            className="px-2.5 py-1 rounded-lg border border-border bg-white/5 hover:bg-destructive/20 hover:text-destructive text-muted-foreground text-xs font-medium transition-all"
                          >
                            Suspend
                          </button>
                        )}

                        {user.status === "SUSPENDED" && (
                          <button
                            onClick={() => handleAction(user.id, { status: "ACTIVE" })}
                            className="px-2.5 py-1 rounded-lg border border-border bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 text-muted-foreground text-xs font-medium transition-all"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
