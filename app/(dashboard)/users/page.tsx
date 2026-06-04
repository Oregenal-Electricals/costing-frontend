"use client";

import RoleGuard from "@/components/auth/RoleGuard";
import { useEffect, useState, useCallback } from "react";
import { UserPlus, Pencil, KeyRound, ToggleLeft, ToggleRight, Search, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import {
  User, Role,
  apiGetUsers, apiGetRoles, apiCreateUser,
  apiUpdateUser, apiToggleUserActive, apiResetPassword,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import UserFormModal from "@/components/users/UserFormModal";
import ResetPasswordModal from "@/components/users/ResetPasswordModal";

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MANAGER: 'bg-green-100 text-green-700',
  SUPERVISOR: 'bg-yellow-100 text-yellow-700',
  OPERATOR: 'bg-orange-100 text-orange-700',
  VIEWER: 'bg-gray-100 text-gray-700',
};

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', MANAGER: 'Manager',
  SUPERVISOR: 'Supervisor', OPERATOR: 'Operator', VIEWER: 'Viewer',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        apiGetUsers(token),
        apiGetRoles(token),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (data: object) => {
    const token = getToken()!;
    await apiCreateUser(token, data);
    showToast('User created successfully');
    loadData();
  };

  const handleUpdate = async (data: object) => {
    const token = getToken()!;
    await apiUpdateUser(token, editUser!.id, data);
    showToast('User updated successfully');
    loadData();
  };

  const handleToggle = async (user: User) => {
    const token = getToken()!;
    try {
      await apiToggleUserActive(token, user.id);
      showToast(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
      loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update', 'error');
    }
  };

  const handleResetPassword = async (password: string) => {
    const token = getToken()!;
    await apiResetPassword(token, resetUser!.id, password);
    showToast('Password reset successfully');
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.employeeCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={clsx(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all",
          toast.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500 mt-1">{users.length} total users</p>
        </div>
        <button
          onClick={() => { setEditUser(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      {/* Search + Refresh */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-gray-700 outline-none flex-1 placeholder-gray-400"
          />
        </div>
        <button onClick={loadData} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("text-xs px-2 py-1 rounded-full font-medium", ROLE_BADGE[user.role.name])}>
                        {ROLE_LABEL[user.role.name] || user.role.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.department || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(user.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditUser(user); setShowForm(true); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setResetUser(user)}
                          className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          onClick={() => handleToggle(user)}
                          className={clsx(
                            "p-1.5 rounded-lg transition-colors",
                            user.isActive
                              ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                              : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                          )}
                          title={user.isActive ? "Deactivate" : "Activate"}
                        >
                          {user.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <UserFormModal
          user={editUser}
          roles={roles}
          onSubmit={editUser ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditUser(null); }}
        />
      )}
      {resetUser && (
        <ResetPasswordModal
          userName={resetUser.name}
          onSubmit={handleResetPassword}
          onClose={() => setResetUser(null)}
        />
      )}
    </div>
    </RoleGuard>
  );
}
