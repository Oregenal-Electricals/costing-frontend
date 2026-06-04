"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Role, User } from "@/lib/api";

interface Props {
  user?: User | null;
  roles: Role[];
  onSubmit: (data: object) => Promise<void>;
  onClose: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SUPERVISOR: 'Supervisor',
  OPERATOR: 'Operator',
  VIEWER: 'Viewer',
};

export default function UserFormModal({ user, roles, onSubmit, onClose }: Props) {
  const isEdit = !!user;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    employeeCode: "",
    name: "",
    email: "",
    password: "",
    roleId: "",
    phone: "",
    department: "",
    designation: "",
    employeeType: "PERMANENT",
  });

  useEffect(() => {
    if (user) {
      setForm({
        employeeCode: user.employeeCode,
        name: user.name,
        email: user.email,
        password: "",
        roleId: String(user.role.id),
        phone: user.phone || "",
        department: user.department || "",
        designation: user.designation || "",
        employeeType: user.employeeType,
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        roleId: Number(form.roleId),
        phone: form.phone || undefined,
        department: form.department || undefined,
        designation: form.designation || undefined,
        employeeType: form.employeeType,
      };
      if (!isEdit) {
        data.employeeCode = form.employeeCode;
        data.password = form.password;
      }
      await onSubmit(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit User" : "Create User"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {!isEdit && (
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Code *</label>
                <input name="employeeCode" value={form.employeeCode} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div className={!isEdit ? "col-span-2 sm:col-span-1" : "col-span-2"}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input name="name" value={form.name} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select name="roleId" value={form.roleId} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{ROLE_LABEL[r.name] || r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee Type</label>
              <select name="employeeType" value={form.employeeType} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="PERMANENT">Permanent</option>
                <option value="CONTRACT">Contract</option>
                <option value="TRAINEE">Trainee</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input name="department" value={form.department} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <input name="designation" value={form.designation} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors">
              {loading ? "Saving..." : isEdit ? "Update User" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
