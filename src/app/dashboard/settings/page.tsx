'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  Users,
  UserPlus,
  Trophy,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Wrench,
  Zap,
  KeyRound,
  Search,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  X,
  Star,
  Activity,
  BarChart3,
  Crown,
  Package,
  SlidersHorizontal,
  Sparkles,
  Building,
  Phone,
  Mail,
  ArrowUpRight,
  ChevronRight,
  BadgeCheck,
  Check,
  Lock,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { UserProfile, UserRole, RepairTicket, Machine } from '@/types/cmms';
import { FACTORY_MECHANICS_ROSTER, MechanicDuty } from '@/lib/constants/mechanics';
import { subscribeRepairs, subscribeMachines } from '@/lib/services/cmmsService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';

interface WorkerKpiData {
  id: string;
  name: string;
  roleTitle: string;
  trade: 'MECHANIC' | 'ELECTRICIAN' | 'SUPERVISOR';
  shift: string;
  specialty: string;
  assignedLines: string;
  status: 'ON_DUTY' | 'STANDBY' | 'ON_LEAVE';
  phone: string;
  avatarColor: string;
  experienceYears: number;
  totalAssigned: number;
  completedBreakdowns: number;
  completedPpms: number;
  totalResolved: number;
  avgMttrMinutes: number;
  slaOnTimeRate: number; // percentage (0 - 100)
  qualityScore: number; // percentage (0 - 100)
  kpiScore: number; // composite percentage (0 - 100)
  rankBadge: {
    label: string;
    tier: 'S' | 'A' | 'B' | 'C';
    bgColor: string;
    textColor: string;
    borderColor: string;
  };
  recentTickets: RepairTicket[];
  isDynamicUser?: boolean;
}

export default function AdminSettingsPage() {
  const { user: currentUser, role: currentRole, loginAsRole } = useAuth();
  const { showToast } = useToast();

  // Active Settings Tab
  const [activeTab, setActiveTab] = useState<'KPI' | 'USERS'>('KPI');

  // Live CMMS Data
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Filters for Worker KPI Scorecard
  const [kpiSearchQuery, setKpiSearchQuery] = useState('');
  const [kpiTradeFilter, setKpiTradeFilter] = useState<'ALL' | 'MECHANIC' | 'ELECTRICIAN' | 'SUPERVISOR'>('ALL');
  const [kpiSortBy, setKpiSortBy] = useState<'SCORE_DESC' | 'TASKS_DESC' | 'MTTR_ASC' | 'NAME_ASC'>('SCORE_DESC');

  // Selected Worker Detail Modal
  const [selectedWorkerDetail, setSelectedWorkerDetail] = useState<WorkerKpiData | null>(null);

  // Filters for User Management
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // New User Form Fields
  const [newRole, setNewRole] = useState<UserRole>('MECHANIC');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTitle, setNewTitle] = useState('Industrial Sewing Machine Mechanic');
  const [newDepartment, setNewDepartment] = useState('Sewing Floor Lines');
  const [newPhone, setNewPhone] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState(`EMP-${Math.floor(100 + Math.random() * 900)}`);
  const [newPassword, setNewPassword] = useState('');

  // Password Reset Modal State
  const [passwordModalUser, setPasswordModalUser] = useState<UserProfile | null>(null);
  const [modalNewPassword, setModalNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Subscribe to live repairs and machines
  useEffect(() => {
    const unsubRepairs = subscribeRepairs((data) => setRepairs(data));
    const unsubMachines = subscribeMachines((data) => setMachines(data));
    return () => {
      unsubRepairs();
      unsubMachines();
    };
  }, []);

  // Fetch Users from MongoDB
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to load users in settings:', err);
      showToast('Error loading registered users', 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle role change in Add User Form
  const handleRoleChange = (role: UserRole) => {
    setNewRole(role);
    switch (role) {
      case 'ADMIN':
        setNewTitle('Plant Administrator & Asset Director');
        setNewDepartment('Factory Operations & Admin');
        break;
      case 'ASSET_MANAGER':
        setNewTitle('Plant Asset Manager');
        setNewDepartment('Asset Management & Audits');
        break;
      case 'SENIOR_MECHANIC':
        setNewTitle('Senior Master Technician & PPM Lead');
        setNewDepartment('Maintenance Workshop');
        break;
      case 'MECHANIC':
        setNewTitle('Industrial Sewing Machine Mechanic');
        setNewDepartment('Sewing Floor Lines');
        break;
      case 'SENIOR_ELECTRICIAN':
        setNewTitle('Senior Plant Electrician & Power Specialist');
        setNewDepartment('Electrical & Power Services');
        break;
      case 'ELECTRICIAN':
        setNewTitle('Industrial Plant Electrician');
        setNewDepartment('Electrical & Utilities');
        break;
      case 'STORE_PERSON':
        setNewTitle('Tool Crib & Store In-Charge');
        setNewDepartment('Tool Crib & Central Stores');
        break;
      default:
        setNewTitle('Factory Staff');
        setNewDepartment('Maintenance');
    }
  };

  // Submit Add User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRole === 'CEO') {
      showToast('Cannot create CEO accounts via admin provisioning.', 'error');
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

    setIsSubmittingNewUser(true);
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
        throw new Error(data.error || 'Failed to create user account');
      }

      showToast(`User ${newName} successfully provisioned!`, 'success');
      setIsAddUserModalOpen(false);

      // Reset form
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewPhone('');
      setNewEmployeeId(`EMP-${Math.floor(100 + Math.random() * 900)}`);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Creation error: ${msg}`, 'error');
    } finally {
      setIsSubmittingNewUser(false);
    }
  };

  // Submit Password Reset
  const handleUpdatePassword = async (e: React.FormEvent) => {
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
        throw new Error(data.error || 'Failed to update user password');
      }

      showToast(`Password successfully updated for ${passwordModalUser.name}!`, 'success');
      setPasswordModalUser(null);
      setModalNewPassword('');
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Error: ${msg}`, 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // WORKER KPI DATA COMPUTATION
  // ─────────────────────────────────────────────────────────────────────────────
  const workerKpiList: WorkerKpiData[] = useMemo(() => {
    // Collect all technical staff from roster + user database
    const rosterList = [...FACTORY_MECHANICS_ROSTER];
    const rosterNames = new Set(rosterList.map((m) => m.name.toLowerCase().trim()));

    // Add any users from DB that are technical staff not already in roster
    const additionalWorkers: MechanicDuty[] = [];
    users.forEach((u) => {
      const isTechRole =
        u.role === 'MECHANIC' ||
        u.role === 'ELECTRICIAN' ||
        u.role === 'SENIOR_MECHANIC' ||
        u.role === 'SENIOR_ELECTRICIAN';
      if (isTechRole && !rosterNames.has(u.name.toLowerCase().trim())) {
        const isElec = u.role === 'ELECTRICIAN' || u.role === 'SENIOR_ELECTRICIAN';
        additionalWorkers.push({
          id: u.employeeId || u.uid,
          name: u.name,
          role: u.title,
          trade: isElec ? 'ELECTRICIAN' : 'MECHANIC',
          shift: 'Shift A (07:00 - 15:30)',
          specialty: u.title || 'Machine Maintenance & Floor Servicing',
          assignedLines: 'Plant-wide Floating Tech',
          status: 'ON_DUTY',
          phone: u.phone || '+91 98401 00000',
          avatarColor: isElec ? 'bg-cyan-600 text-white' : 'bg-indigo-600 text-white',
          experienceYears: 5,
          toolbox: {
            kitCode: `TBX-${u.employeeId || 'GEN'}`,
            kitName: 'Standard Diagnostic & Tool Set',
            lastAudited: '2026-10-01',
            items: ['Precision Hex Screwdriver', 'Adjustable Wrench', 'Inspection Penlight'],
          },
          checkedOutTools: [],
          activePartsDrawn: [],
          activeMachineTasks: [],
        });
      }
    });

    const combinedPersonnel = [...rosterList, ...additionalWorkers];

    return combinedPersonnel.map((worker) => {
      const wNameLower = worker.name.toLowerCase().trim();
      const wFirstName = wNameLower.split(' ')[0] || '';

      // Match tickets handled by this technician
      const matchingTickets = repairs.filter((r) => {
        if (!r.attendedBy) return false;
        const attLower = r.attendedBy.toLowerCase().trim();
        return (
          attLower === wNameLower ||
          attLower.includes(wFirstName) ||
          wNameLower.includes(attLower)
        );
      });

      const completedTickets = matchingTickets.filter((r) => r.status === 'COMPLETED');
      const pendingOrActiveTickets = matchingTickets.filter((r) => r.status === 'ASSIGNED' || r.status === 'PENDING');

      // Breakdowns vs PPMs
      const completedPpms = completedTickets.filter(
        (r) =>
          r.faultCategory?.toLowerCase().includes('ppm') ||
          r.faultDetails?.toLowerCase().includes('ppm') ||
          r.actionTaken?.toLowerCase().includes('ppm') ||
          r.reportedBy?.toLowerCase().includes('ppm')
      );
      const completedBreakdowns = completedTickets.filter((r) => !completedPpms.includes(r));

      // Calculate Average MTTR
      let totalDowntimeMinutes = 0;
      let ticketWithTimeCount = 0;
      completedTickets.forEach((t) => {
        if (t.downtimeMinutes && t.downtimeMinutes > 0) {
          totalDowntimeMinutes += t.downtimeMinutes;
          ticketWithTimeCount++;
        }
      });

      // Default baseline MTTR tailored by experience if few live tickets
      const baselineMttr = Math.max(18, 32 - Math.floor(worker.experienceYears * 0.9));
      const avgMttr = ticketWithTimeCount > 0
        ? Math.round(totalDowntimeMinutes / ticketWithTimeCount)
        : baselineMttr;

      // SLA Compliance Rate (% resolved under benchmark 45m)
      const onTimeTickets = completedTickets.filter((t) => (t.downtimeMinutes || 30) <= 50);
      const slaRate = completedTickets.length > 0
        ? Math.min(100, Math.round((onTimeTickets.length / completedTickets.length) * 100))
        : 95;

      // Quality / First-Time Fix Rating
      const qualityScore = completedTickets.length > 0
        ? Math.min(100, Math.max(88, 92 + Math.min(8, completedTickets.length)))
        : 94;

      // Calculate Composite Worker KPI Score (0 - 100%)
      // Weights:
      // 1. Completion & Activity Rate: 35%
      // 2. Speed / MTTR Efficiency: 25% (lower MTTR is better)
      // 3. Preventive / PPM Adherence: 20%
      // 4. SLA & Quality Score: 20%
      const speedScore = Math.max(65, Math.min(100, Math.round(118 - (avgMttr * 0.9))));
      const activityScore = Math.min(100, Math.max(80, 84 + (completedTickets.length * 3.5)));
      const ppmScore = Math.min(100, Math.max(78, 86 + (completedPpms.length * 4.5)));
      const finalQualitySla = Math.round((slaRate * 0.5) + (qualityScore * 0.5));

      const compositeKpi = Math.min(
        100,
        Math.max(
          70,
          Math.round(
            (activityScore * 0.35) +
            (speedScore * 0.25) +
            (ppmScore * 0.20) +
            (finalQualitySla * 0.20)
          )
        )
      );

      // Rank Badge
      let rankBadge: WorkerKpiData['rankBadge'];
      if (compositeKpi >= 94) {
        rankBadge = {
          label: 'Master Elite',
          tier: 'S',
          bgColor: 'bg-emerald-500/10 text-emerald-700',
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-300',
        };
      } else if (compositeKpi >= 88) {
        rankBadge = {
          label: 'High Performer',
          tier: 'A',
          bgColor: 'bg-indigo-500/10 text-indigo-700',
          textColor: 'text-indigo-700',
          borderColor: 'border-indigo-300',
        };
      } else if (compositeKpi >= 78) {
        rankBadge = {
          label: 'Proficient',
          tier: 'B',
          bgColor: 'bg-blue-500/10 text-blue-700',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-300',
        };
      } else {
        rankBadge = {
          label: 'Developing',
          tier: 'C',
          bgColor: 'bg-amber-500/10 text-amber-700',
          textColor: 'text-amber-700',
          borderColor: 'border-amber-300',
        };
      }

      // Infer trade
      let trade: WorkerKpiData['trade'] = 'MECHANIC';
      if (worker.trade === 'ELECTRICIAN' || worker.role.toLowerCase().includes('electrician')) {
        trade = 'ELECTRICIAN';
      } else if (worker.role.toLowerCase().includes('senior') || worker.role.toLowerCase().includes('lead')) {
        trade = 'SUPERVISOR';
      }

      return {
        id: worker.id,
        name: worker.name,
        roleTitle: worker.role,
        trade,
        shift: worker.shift,
        specialty: worker.specialty,
        assignedLines: worker.assignedLines,
        status: worker.status,
        phone: worker.phone,
        avatarColor: worker.avatarColor,
        experienceYears: worker.experienceYears,
        totalAssigned: matchingTickets.length,
        completedBreakdowns: completedBreakdowns.length,
        completedPpms: completedPpms.length,
        totalResolved: completedTickets.length,
        avgMttrMinutes: avgMttr,
        slaOnTimeRate: slaRate,
        qualityScore,
        kpiScore: compositeKpi,
        rankBadge,
        recentTickets: completedTickets.slice(0, 5),
        isDynamicUser: additionalWorkers.some((a) => a.id === worker.id),
      };
    });
  }, [repairs, users]);

  // Filtered & Sorted Worker KPI list
  const filteredKpiWorkers = useMemo(() => {
    return workerKpiList
      .filter((w) => {
        const matchesSearch =
          w.name.toLowerCase().includes(kpiSearchQuery.toLowerCase()) ||
          w.id.toLowerCase().includes(kpiSearchQuery.toLowerCase()) ||
          w.specialty.toLowerCase().includes(kpiSearchQuery.toLowerCase()) ||
          w.assignedLines.toLowerCase().includes(kpiSearchQuery.toLowerCase());

        const matchesTrade =
          kpiTradeFilter === 'ALL' ||
          (kpiTradeFilter === 'SUPERVISOR' && w.trade === 'SUPERVISOR') ||
          (kpiTradeFilter === 'MECHANIC' && w.trade === 'MECHANIC') ||
          (kpiTradeFilter === 'ELECTRICIAN' && w.trade === 'ELECTRICIAN');

        return matchesSearch && matchesTrade;
      })
      .sort((a, b) => {
        if (kpiSortBy === 'SCORE_DESC') return b.kpiScore - a.kpiScore;
        if (kpiSortBy === 'TASKS_DESC') return b.totalResolved - a.totalResolved;
        if (kpiSortBy === 'MTTR_ASC') return a.avgMttrMinutes - b.avgMttrMinutes;
        if (kpiSortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [workerKpiList, kpiSearchQuery, kpiTradeFilter, kpiSortBy]);

  // High-level workforce aggregate stats
  const aggregateKpiStats = useMemo(() => {
    if (workerKpiList.length === 0) {
      return { avgScore: 92, avgMttr: 28, totalTasks: 0, onDutyCount: 0 };
    }
    const sumScore = workerKpiList.reduce((acc, w) => acc + w.kpiScore, 0);
    const sumMttr = workerKpiList.reduce((acc, w) => acc + w.avgMttrMinutes, 0);
    const totalResolved = workerKpiList.reduce((acc, w) => acc + w.totalResolved, 0);
    const onDutyCount = workerKpiList.filter((w) => w.status === 'ON_DUTY').length;

    return {
      avgScore: Math.round(sumScore / workerKpiList.length),
      avgMttr: Math.round(sumMttr / workerKpiList.length),
      totalTasks: totalResolved,
      onDutyCount,
    };
  }, [workerKpiList]);

  // ─────────────────────────────────────────────────────────────────────────────
  // FILTERED USER DIRECTORY
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
        (u.department && u.department.toLowerCase().includes(userSearchQuery.toLowerCase()));

      const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userSearchQuery, userRoleFilter]);

  const userStats = useMemo(() => {
    const total = users.length;
    const mechanics = users.filter((u) => u.role === 'MECHANIC' || u.role === 'SENIOR_MECHANIC').length;
    const electricians = users.filter((u) => u.role === 'ELECTRICIAN' || u.role === 'SENIOR_ELECTRICIAN').length;
    const adminLeadership = users.filter((u) => u.role === 'ADMIN' || u.role === 'ASSET_MANAGER' || u.role === 'CEO').length;
    return { total, mechanics, electricians, adminLeadership };
  }, [users]);

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
      case 'ASSET_MANAGER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SENIOR_MECHANIC':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MECHANIC':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'SENIOR_ELECTRICIAN':
      case 'ELECTRICIAN':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'STORE_PERSON':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CEO':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─────────────────────────────────────────────────────────────────────────
          HEADER & ACTIONS
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Admin System Settings
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                  Admin Control Panel
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Provision users, configure access credentials, and monitor technician workforce KPI scorecards.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="px-4 py-2.5 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs hover:shadow-indigo-500/25 transition flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB SWITCHER
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-slate-200 bg-white rounded-xl px-2 shadow-xs">
        <button
          onClick={() => setActiveTab('KPI')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'KPI'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Worker KPI Scorecards & Performance</span>
          <span className="ml-1.5 px-2 py-0.5 text-[10px] rounded-full bg-indigo-100 text-indigo-700 font-bold">
            {workerKpiList.length} Technicians
          </span>
        </button>

        <button
          onClick={() => setActiveTab('USERS')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'USERS'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-600" />
          <span>User Accounts & Provisioning Desk</span>
          <span className="ml-1.5 px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600 font-bold">
            {users.length} Users
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 1: WORKER KPI SCORECARD & LEADERBOARD
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'KPI' && (
        <div className="space-y-6">
          {/* Summary KPI Highlights */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fleet Avg KPI</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Star className="w-4 h-4 fill-amber-500" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{aggregateKpiStats.avgScore}%</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  High Standard
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 font-medium">Weighted across speed, resolution & PPM</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Plant MTTR</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{aggregateKpiStats.avgMttr}m</span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  Target &lt;45m
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 font-medium">Average breakdown restoration speed</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Work Resolved</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{aggregateKpiStats.totalTasks}</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Completed
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 font-medium">Logged breakdown tickets & PPM overhauls</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active On-Duty</span>
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Activity className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {aggregateKpiStats.onDutyCount} / {workerKpiList.length}
                </span>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Coverage 100%
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 font-medium">Full shift coverage across Line A - D</p>
            </div>
          </div>

          {/* Search, Filter & Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search technician by name, ID or specialty..."
                value={kpiSearchQuery}
                onChange={(e) => setKpiSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {/* Trade Filter */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
                {(['ALL', 'MECHANIC', 'ELECTRICIAN', 'SUPERVISOR'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setKpiTradeFilter(t)}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      kpiTradeFilter === t
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t === 'ALL' ? 'All Trades' : t === 'SUPERVISOR' ? 'Senior Leads' : `${t}s`}
                  </button>
                ))}
              </div>

              {/* Sort Order */}
              <select
                value={kpiSortBy}
                onChange={(e) => setKpiSortBy(e.target.value as any)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shrink-0"
              >
                <option value="SCORE_DESC">🏆 Highest KPI Score</option>
                <option value="TASKS_DESC">⚡ Most Tasks Done</option>
                <option value="MTTR_ASC">⏱️ Fastest MTTR Speed</option>
                <option value="NAME_ASC">🔤 Technician Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Technicians KPI Leaderboard Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">Factory Technician KPI Leaderboard</h2>
                <p className="text-xs text-slate-500">Live operational scoring based on resolved maintenance work orders & PPM compliance</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                Showing {filteredKpiWorkers.length} workers
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-2xs">
              <table className="w-full text-left border-collapse border border-slate-300 text-xs sm:text-sm">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-300 z-10 shadow-2xs select-none">
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 bg-slate-100 border-r border-b border-slate-300">Rank & Worker</th>
                    <th className="py-2.5 px-3 bg-slate-100 border-r border-b border-slate-300">Role & Line</th>
                    <th className="py-2.5 px-3 bg-slate-100 border-r border-b border-slate-300 text-center">Breakdowns</th>
                    <th className="py-2.5 px-3 bg-slate-100 border-r border-b border-slate-300 text-center">PPM Done</th>
                    <th className="py-2.5 px-3 bg-slate-100 border-r border-b border-slate-300 text-center">Avg MTTR</th>
                    <th className="py-2.5 px-3 bg-slate-100 border-r border-b border-slate-300 text-center">SLA Adherence</th>
                    <th className="py-2.5 px-3 bg-slate-100 border-r border-b border-slate-300 text-center">Composite KPI</th>
                    <th className="py-2.5 px-3 bg-slate-100 border-b border-slate-300 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="font-medium">
                  {filteredKpiWorkers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 border-b border-slate-200">
                        <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-semibold">No technicians matched your filter criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredKpiWorkers.map((worker, index) => {
                      const isTop3 = index < 3 && kpiSortBy === 'SCORE_DESC';

                      return (
                        <tr
                          key={worker.id}
                          className="hover:bg-blue-50/60 even:bg-slate-50/40 transition group"
                        >
                          {/* Rank & Worker */}
                          <td className="py-2.5 px-3 border-r border-b border-slate-200">
                            <div className="flex items-center gap-3">
                              <div className="w-6 text-center font-black text-xs">
                                {isTop3 ? (
                                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] ${
                                    index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-400' : 'bg-amber-700'
                                  }`}>
                                    {index + 1}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">#{index + 1}</span>
                                )}
                              </div>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black uppercase shrink-0 ${worker.avatarColor}`}>
                                {worker.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                                    {worker.name}
                                  </span>
                                  {worker.isDynamicUser && (
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-md">
                                      New
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                                  <span>{worker.id}</span>
                                  <span>•</span>
                                  <span>{worker.experienceYears}y Exp</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role & Line */}
                          <td className="py-2.5 px-3 border-r border-b border-slate-200">
                            <div>
                              <span className="font-semibold text-slate-800 text-xs block">
                                {worker.roleTitle}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {worker.assignedLines}
                              </span>
                            </div>
                          </td>

                          {/* Breakdowns Completed */}
                          <td className="py-2.5 px-3 border-r border-b border-slate-200 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                              <Wrench className="w-3 h-3" />
                              {worker.completedBreakdowns}
                            </span>
                          </td>

                          {/* PPM Completed */}
                          <td className="py-2.5 px-3 border-r border-b border-slate-200 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              {worker.completedPpms}
                            </span>
                          </td>

                          {/* Avg MTTR */}
                          <td className="py-2.5 px-3 border-r border-b border-slate-200 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="font-black text-slate-900 text-xs font-mono">
                                {worker.avgMttrMinutes}m
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                {worker.avgMttrMinutes <= 30 ? 'Fast' : 'Standard'}
                              </span>
                            </div>
                          </td>

                          {/* SLA Adherence */}
                          <td className="py-2.5 px-3 border-r border-b border-slate-200 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-slate-800 text-xs font-mono">
                                {worker.slaOnTimeRate}%
                              </span>
                              <div className="w-16 bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    worker.slaOnTimeRate >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${worker.slaOnTimeRate}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Composite KPI Score */}
                          <td className="py-2.5 px-3 border-r border-b border-slate-200 text-center">
                            <div className="inline-flex flex-col items-center">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-black text-slate-900 font-mono">
                                  {worker.kpiScore}%
                                </span>
                                <span className={`px-2 py-0.5 text-[10px] font-black rounded border ${worker.rankBadge.bgColor} ${worker.rankBadge.borderColor}`}>
                                  {worker.rankBadge.tier} • {worker.rankBadge.label}
                                </span>
                              </div>
                              <div className="w-24 bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    worker.kpiScore >= 90
                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                      : worker.kpiScore >= 80
                                      ? 'bg-gradient-to-r from-indigo-500 to-blue-500'
                                      : 'bg-gradient-to-r from-amber-500 to-orange-500'
                                  }`}
                                  style={{ width: `${worker.kpiScore}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Action */}
                          <td className="py-2.5 px-3 border-b border-slate-200 text-right">
                            <button
                              onClick={() => setSelectedWorkerDetail(worker)}
                              className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition cursor-pointer"
                            >
                              Details
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
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 2: USER MANAGEMENT & ADD USER DESK
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'USERS' && (
        <div className="space-y-6">
          {/* User Directory Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Accounts</span>
              <p className="text-2xl font-black text-slate-900 mt-2">{userStats.total}</p>
              <span className="text-[11px] text-slate-400">All registered users</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Sewing Mechanics</span>
              <p className="text-2xl font-black text-indigo-600 mt-2">{userStats.mechanics}</p>
              <span className="text-[11px] text-slate-400">Junior & Senior tech</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Plant Electricians</span>
              <p className="text-2xl font-black text-cyan-600 mt-2">{userStats.electricians}</p>
              <span className="text-[11px] text-slate-400">Power & Servo specialists</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Administration</span>
              <p className="text-2xl font-black text-blue-600 mt-2">{userStats.adminLeadership}</p>
              <span className="text-[11px] text-slate-400">Admin & Managers</span>
            </div>
          </div>

          {/* User Search & Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user by name, email, department..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
                {(['ALL', 'MECHANIC', 'ELECTRICIAN', 'SENIOR_MECHANIC', 'ADMIN', 'STORE_PERSON'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setUserRoleFilter(r)}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      userRoleFilter === r
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {r === 'ALL' ? 'All Roles' : r.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchUsers}
                disabled={isLoadingUsers}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Refresh users"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">Registered System Accounts</h2>
                <p className="text-xs text-slate-500">Manage user access credentials, roles, and password policies</p>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add User</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-2xs">
              <table className="w-full text-left border-collapse border border-slate-300 text-xs sm:text-sm">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-300 z-10 shadow-2xs select-none">
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 bg-slate-100 border-r border-b border-slate-300">User</th>
                    <th className="py-2.5 px-3 bg-slate-100 border-r border-b border-slate-300">Role</th>
                    <th className="py-2.5 px-3 bg-slate-100 border-r border-b border-slate-300">Department</th>
                    <th className="py-2.5 px-3 bg-slate-100 border-r border-b border-slate-300">Contact</th>
                    <th className="py-2.5 px-3 bg-slate-100 border-r border-b border-slate-300">Default Pass</th>
                    <th className="py-2.5 px-3 bg-slate-100 border-r border-b border-slate-300 text-center">Status</th>
                    <th className="py-2.5 px-3 bg-slate-100 border-b border-slate-300 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 border-b border-slate-200">
                        <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-semibold">No users found matching your search.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-blue-50/60 even:bg-slate-50/40 transition">
                        {/* User Profile */}
                        <td className="py-2 px-3 border-r border-b border-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-xs shrink-0">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{u.name}</span>
                              <span className="text-[11px] text-slate-400 font-mono">{u.employeeId || u.uid}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-2 px-3 border-r border-b border-slate-200">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${getRoleBadgeStyle(u.role)}`}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="py-2 px-3 border-r border-b border-slate-200">
                          <span className="text-slate-600 text-xs block">{u.department || 'Plant Operations'}</span>
                          <span className="text-[11px] text-slate-400">{u.title}</span>
                        </td>

                        {/* Contact */}
                        <td className="py-2 px-3 border-r border-b border-slate-200">
                          <span className="text-slate-800 text-xs block font-mono">{u.email}</span>
                          <span className="text-[11px] text-slate-400">{u.phone || 'No phone'}</span>
                        </td>

                        {/* Default Pass */}
                        <td className="py-2 px-3 border-r border-b border-slate-200">
                          <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {u.defaultPassword || '••••••••'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-2 px-3 border-r border-b border-slate-200 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            ACTIVE
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 border-b border-slate-200 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setPasswordModalUser(u);
                                setModalNewPassword('');
                              }}
                              className="px-2 py-1 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 rounded transition flex items-center gap-1 cursor-pointer"
                              title="Reset Password"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>Reset</span>
                            </button>
                            <button
                              onClick={() => {
                                loginAsRole(u.role);
                                showToast(`Switched active session to ${u.name} (${u.role})`, 'info');
                              }}
                              className="px-2 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition flex items-center gap-1 cursor-pointer"
                              title="Test role session"
                            >
                              <Zap className="w-3 h-3" />
                              <span>Switch</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 1: ADD NEW USER
      ────────────────────────────────────────────────────────────────────────── */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Provision New CMMS User</h3>
                  <p className="text-xs text-slate-500">Create login credentials and assign factory role</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  System Role & Responsibility <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newRole}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-semibold"
                >
                  <option value="MECHANIC">🦺 Industrial Sewing Machine Mechanic</option>
                  <option value="ELECTRICIAN">⚡ Industrial Plant Electrician</option>
                  <option value="SENIOR_MECHANIC">🔧 Senior Master Technician & PPM Lead</option>
                  <option value="SENIOR_ELECTRICIAN">⚡ Senior Plant Electrician & Power Lead</option>
                  <option value="STORE_PERSON">📦 Tool Crib & Inventory Custodian</option>
                  <option value="ADMIN">🛡️ Plant Administrator & Asset Director</option>
                  <option value="ASSET_MANAGER">🏢 Asset Manager</option>
                </select>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M. Vijay"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Work Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. vijay@textech.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Title & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Job Title / Designation
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department / Line
                  </label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Employee ID & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={newEmployeeId}
                    onChange={(e) => setNewEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98401 xxxxx"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Login Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  User can use this password to sign into the system.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewUser}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingNewUser ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Create User</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 2: RESET PASSWORD
      ────────────────────────────────────────────────────────────────────────── */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Reset User Password</h3>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Updating password for <strong className="text-slate-900">{passwordModalUser.name}</strong> ({passwordModalUser.email}).
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Enter at least 6 characters"
                  value={modalNewPassword}
                  onChange={(e) => setModalNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingPassword ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 3: WORKER KPI DETAILED PERFORMANCE SHEET
      ────────────────────────────────────────────────────────────────────────── */}
      {selectedWorkerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black uppercase text-white ${selectedWorkerDetail.avatarColor}`}>
                  {selectedWorkerDetail.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{selectedWorkerDetail.name}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-black rounded-full border ${selectedWorkerDetail.rankBadge.bgColor} ${selectedWorkerDetail.rankBadge.borderColor}`}>
                      Rank {selectedWorkerDetail.rankBadge.tier} • {selectedWorkerDetail.rankBadge.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{selectedWorkerDetail.roleTitle} • {selectedWorkerDetail.assignedLines}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWorkerDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* KPI Metrics Dashboard inside sheet */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Composite KPI</span>
                <p className="text-2xl font-black text-indigo-700 mt-1">{selectedWorkerDetail.kpiScore}%</p>
                <span className="text-[10px] text-slate-400">Weighted Performance</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Avg MTTR</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{selectedWorkerDetail.avgMttrMinutes}m</p>
                <span className="text-[10px] text-emerald-600 font-bold">Fast Restoration</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Breakdowns Done</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{selectedWorkerDetail.completedBreakdowns}</p>
                <span className="text-[10px] text-slate-400">Total WO Resolved</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">PPM Overhauls</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">{selectedWorkerDetail.completedPpms}</p>
                <span className="text-[10px] text-slate-400">100% Scheduled Done</span>
              </div>
            </div>

            {/* Specialty & Roster Details */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Specialty & Calibration:</span>
                <span className="font-semibold text-indigo-800">{selectedWorkerDetail.specialty}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Shift Schedule:</span>
                <span className="font-semibold text-slate-800">{selectedWorkerDetail.shift}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">On-Duty Phone Contact:</span>
                <span className="font-mono text-slate-800">{selectedWorkerDetail.phone}</span>
              </div>
            </div>

            {/* Recent Ticket Logs */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Recent Resolved Work Orders
              </h4>
              {selectedWorkerDetail.recentTickets.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No tickets completed today yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedWorkerDetail.recentTickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-600">{t.id}</span>
                          <span className="font-bold text-slate-800">{t.machineId}</span>
                          <span className="text-slate-400">• {t.line}</span>
                        </div>
                        <p className="text-slate-500 mt-0.5 line-clamp-1">{t.faultDetails || t.faultCategory}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-slate-900">{t.downtimeMinutes || 25} mins</span>
                        <span className="block text-[10px] text-emerald-600 font-bold">COMPLETED</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setSelectedWorkerDetail(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              >
                Close Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
