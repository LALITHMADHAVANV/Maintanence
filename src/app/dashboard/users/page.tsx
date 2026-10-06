'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Wrench,
  Package,
  Crown,
  Search,
  KeyRound,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  Filter,
  BadgeCheck,
  UserCheck,
  LogIn,
  Zap,
} from 'lucide-react';
import { UserProfile, UserRole } from '@/types/cmms';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';

export default function UserManagementPage() {
  const { user: currentUser, role: currentRole, loginAsRole } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // New User Form State
  const [newRole, setNewRole] = useState<UserRole>('MECHANIC');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTitle, setNewTitle] = useState('Industrial Sewing Machine Mechanic');
  const [newDepartment, setNewDepartment] = useState('Maintenance Workshop');
  const [newPhone, setNewPhone] = useState('+91 98421 ');
  const [newEmployeeId, setNewEmployeeId] = useState(`EMP-${Math.floor(100 + Math.random() * 900)}`);
  const [newPassword, setNewPassword] = useState('mechanic123');

  // Change Password Modal State
  const [passwordModalUser, setPasswordModalUser] = useState<UserProfile | null>(null);
  const [modalNewPassword, setModalNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Fetch users from API
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      showToast('Error loading user directory', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Update default title & password suggestion when role changes in form
  const handleRoleChange = (role: UserRole) => {
    setNewRole(role);
    switch (role) {
      case 'ADMIN':
        setNewTitle('Plant Administrator & Asset Director');
        setNewDepartment('Plant Management');
        setNewPassword('admin123');
        break;
      case 'SENIOR_MECHANIC':
        setNewTitle('Senior Master Technician & PPM Lead');
        setNewDepartment('Maintenance Workshop');
        setNewPassword('senior123');
        break;
      case 'MECHANIC':
        setNewTitle('Industrial Sewing Machine Mechanic');
        setNewDepartment('Sewing Floor');
        setNewPassword('mechanic123');
        break;
      case 'SENIOR_ELECTRICIAN':
        setNewTitle('Senior Electrical Engineer & Power Systems Lead');
        setNewDepartment('Electrical & Power Services');
        setNewPassword('senior123');
        break;
      case 'ELECTRICIAN':
        setNewTitle('Industrial Electrician & Wiring Technician');
        setNewDepartment('Electrical & Power Services');
        setNewPassword('electrician123');
        break;
      case 'STORE_PERSON':
        setNewTitle('Tool Crib & Store In-Charge');
        setNewDepartment('Tool Crib Stores');
        setNewPassword('stores123');
        break;
    }
  };

  // Submit Add User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRole === 'CEO') {
      showToast('Cannot create CEO accounts via admin user provisioning', 'error');
      return;
    }
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      showToast('Please fill in all mandatory fields', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          role: newRole,
          title: newTitle.trim(),
          department: newDepartment.trim(),
          phone: newPhone.trim(),
          employeeId: newEmployeeId.trim(),
          password: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      showToast(`User ${newName} successfully created in Supabase Auth & DB!`, 'success');
      setIsAddUserModalOpen(false);

      // Reset form
      setNewName('');
      setNewEmail('');
      setNewEmployeeId(`EMP-${Math.floor(100 + Math.random() * 900)}`);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Failed: ${msg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !modalNewPassword.trim()) return;

    if (modalNewPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: passwordModalUser.email,
          password: modalNewPassword.trim(),
          name: passwordModalUser.name,
          role: passwordModalUser.role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      showToast(`Password updated for ${passwordModalUser.name}!`, 'success');
      setPasswordModalUser(null);
      setModalNewPassword('');
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Failed: ${msg}`, 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Statistics
  const mechanicCount = users.filter((u) => u.role === 'MECHANIC' || u.role === 'SENIOR_MECHANIC').length;
  const storeCount = users.filter((u) => u.role === 'STORE_PERSON').length;
  const leadershipCount = users.filter((u) => u.role === 'ADMIN' || u.role === 'CEO').length;

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'CEO':
        return {
          label: 'Chief Executive',
          color: 'bg-purple-100 text-purple-800 border-purple-300',
          icon: Crown,
          avatarBg: 'bg-purple-600',
        };
      case 'ADMIN':
        return {
          label: 'Plant Administrator',
          color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          icon: Shield,
          avatarBg: 'bg-indigo-600',
        };
      case 'SENIOR_MECHANIC':
        return {
          label: 'Senior Master Tech',
          color: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: Wrench,
          avatarBg: 'bg-amber-600',
        };
      case 'MECHANIC':
        return {
          label: 'Floor Mechanic',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: Wrench,
          avatarBg: 'bg-emerald-600',
        };
      case 'SENIOR_ELECTRICIAN':
        return {
          label: 'Senior Electrician',
          color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
          icon: Zap,
          avatarBg: 'bg-cyan-600',
        };
      case 'ELECTRICIAN':
        return {
          label: 'Industrial Electrician',
          color: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: Zap,
          avatarBg: 'bg-amber-600',
        };
      case 'STORE_PERSON':
        return {
          label: 'Tool Crib Custodian',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: Package,
          avatarBg: 'bg-blue-600',
        };
      default:
        return {
          label: role,
          color: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: Users,
          avatarBg: 'bg-slate-600',
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white text-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>Plant Administrator Desk</span>
            </span>
            <span className="text-xs text-slate-500 font-mono font-medium">
              Live Supabase Authentication &amp; RBAC
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5 text-slate-900">
            <Users className="w-7 h-7 text-indigo-600" />
            <span>Factory User Directory &amp; Access Provisioning</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Register and manage plant technicians, assign security roles, issue credentials, and configure authorization for floor operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddUserModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs shadow-indigo-600/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add New User</span>
          </button>
          <button
            type="button"
            onClick={fetchUsers}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer border border-slate-700"
            title="Refresh User Directory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Total Staff</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{users.length}</div>
          <div className="text-[10px] text-slate-500">Registered Accounts</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mechanics &amp; Techs</span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{mechanicCount}</div>
          <div className="text-[10px] text-emerald-600 font-semibold">Active Floor Service</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-blue-600" />
            <span>Store Custody</span>
          </div>
          <div className="text-2xl font-black text-blue-700 mt-1">{storeCount}</div>
          <div className="text-[10px] text-slate-500">Tool Crib Storekeeper</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 text-purple-600" />
            <span>Executive &amp; Admin</span>
          </div>
          <div className="text-2xl font-black text-purple-700 mt-1">{leadershipCount}</div>
          <div className="text-[10px] text-slate-500">Full Authority Users</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, employee ID, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Role:</span>
          </span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="ADMIN">Plant Administrators</option>
            <option value="SENIOR_MECHANIC">Senior Mechanics</option>
            <option value="MECHANIC">Line Mechanics</option>
            <option value="SENIOR_ELECTRICIAN">Senior Electricians</option>
            <option value="ELECTRICIAN">Junior Electricians</option>
            <option value="STORE_PERSON">Store Custodians</option>
            <option value="CEO">Chief Executive</option>
          </select>

          <button
            type="button"
            onClick={() => setIsAddUserModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* User Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">User &amp; Profile</th>
                <th className="py-3.5 px-4">Factory Role</th>
                <th className="py-3.5 px-4">Department &amp; Title</th>
                <th className="py-3.5 px-4">Contact (Email / Phone)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No users matching search filters found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const badge = getRoleBadge(u.role);
                  const BadgeIcon = badge.icon;
                  const isCurrent = currentUser?.email?.toLowerCase() === u.email.toLowerCase();

                  return (
                    <tr key={u.uid || u.email} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs uppercase shrink-0 shadow-xs ${badge.avatarBg}`}
                          >
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded-full border border-indigo-200">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {u.employeeId || `UID: ${u.uid?.slice(0, 8)}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{u.title || 'Staff'}</div>
                        <div className="text-[10px] text-slate-500">{u.department || 'Floor Unit'}</div>
                      </td>

                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="flex items-center gap-1 text-slate-700 font-mono text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>ACTIVE</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordModalUser(u);
                            setModalNewPassword(u.defaultPassword || 'sewing123');
                          }}
                          className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition inline-flex items-center gap-1"
                          title="Reset / Set Password in Supabase Auth"
                        >
                          <KeyRound className="w-3 h-3 text-slate-500" />
                          <span>Password</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await loginAsRole(u.role);
                              showToast(`Switched active session to ${u.name} (${u.role})`, 'info');
                              if (u.role === 'CEO') router.push('/dashboard/messages');
                              else if (u.role === 'STORE_PERSON') router.push('/dashboard/store-inbox');
                              else if (u.role === 'MECHANIC' || u.role === 'SENIOR_MECHANIC' || u.role === 'ELECTRICIAN' || u.role === 'SENIOR_ELECTRICIAN') router.push('/dashboard/calendar');
                              else router.push('/dashboard/machines');
                            } catch (err: unknown) {
                              const msg = err instanceof Error ? err.message : String(err);
                              showToast(`Switch failed: ${msg}`, 'error');
                            }
                          }}
                          className="px-2.5 py-1 text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold rounded-lg transition inline-flex items-center gap-1"
                          title="Simulate authentication as this user"
                        >
                          <LogIn className="w-3 h-3" />
                          <span>Login As</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: ADD NEW USER                                           */}
      {/* ============================================================== */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Register New Factory User</h3>
                  <p className="text-xs text-indigo-200/80">
                    Provisions account in Supabase Authentication &amp; PostgreSQL Database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              {/* Role Selection Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Role &amp; Access Level *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['MECHANIC', 'SENIOR_MECHANIC', 'ELECTRICIAN', 'SENIOR_ELECTRICIAN', 'STORE_PERSON', 'ADMIN'] as UserRole[]).map(
                    (r) => {
                      const isSelected = newRole === r;
                      const badge = getRoleBadge(r);
                      const Icon = badge.icon;

                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleRoleChange(r)}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5" />
                            <span className="font-bold text-xs">{r.replace('_', ' ')}</span>
                          </div>
                          <span
                            className={`text-[9px] mt-1 ${
                              isSelected ? 'text-indigo-100' : 'text-slate-400'
                            }`}
                          >
                            {badge.label}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anandhan Sundar"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. anandhan@textech.garments"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Title & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Job Title
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Maintenance Workshop">Maintenance Workshop</option>
                    <option value="Sewing Floor">Sewing Floor</option>
                    <option value="Tool Crib Stores">Tool Crib Stores</option>
                    <option value="Cutting Department">Cutting Department</option>
                    <option value="Finishing & Pressing">Finishing &amp; Pressing</option>
                    <option value="Plant Management">Plant Management</option>
                    <option value="Executive Board">Executive Board</option>
                  </select>
                </div>
              </div>

              {/* Phone & Employee ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={newEmployeeId}
                    onChange={(e) => setNewEmployeeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone / Intercom
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Initial Password in Supabase Auth *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  User can log in immediately with this email and password.
                </span>
              </div>

              {/* Footer buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Provision User</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CHANGE USER PASSWORD                                    */}
      {/* ============================================================== */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Reset User Password</h3>
                  <p className="text-xs text-slate-400">{passwordModalUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password for {passwordModalUser.name} *
                </label>
                <input
                  type="text"
                  required
                  value={modalNewPassword}
                  onChange={(e) => setModalNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  placeholder="Enter at least 6 characters"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Directly writes new password into Supabase Authentication.
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isUpdatingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
