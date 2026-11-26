'use client';

import { tenantPreferences } from '@/lib/tenantPreferences';
import { departmentNavigationChanged, departmentDefaultNavigation } from '@/lib/departmentNavigation';
import { DepartmentNavigationChecklist } from '@/components/layout/DepartmentNavigationChecklist';
import { DepartmentSettingsPanel } from '@/components/settings/DepartmentSettingsPanel';
import { HelpDesk } from '@/components/settings/HelpDesk';
import { UnitSettingsPanel } from '@/components/settings/UnitSettingsPanel';
import { UserSettingsPanel } from '@/components/settings/UserSettingsPanel';
import { UserNavigationSettings } from '@/components/settings/UserNavigationSettings';
import { PageLoadingIndicator } from '@/components/layout/PageLoadingIndicator';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
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
  Building2,
  Globe,
  Plus,
  Pencil,
  Trash2,
  MessageCircle,
  Phone,
  Mail,
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  BadgeCheck,
  Check,
  Lock,
  Layers,
  ChevronDown,
  MapPin,
  Send,
  Bot,
  BellRing,
} from 'lucide-react';
import { UserProfile, UserRole, RepairTicket, Machine } from '@/types/cmms';
import { FACTORY_MECHANICS_ROSTER, MechanicDuty } from '@/lib/constants/mechanics';
import { FACTORY_UNITS, getUnitBadgeInfo, matchesUnit, getZonesForUnit } from '@/lib/constants/units';
import { apiFetch, subscribeRepairs, subscribeMachines } from '@/lib/services/cmmsService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';

// ─── FACTORY UNIT DATA MODEL & PRESETS ───
export interface FactoryUnitZoneItem {
  id: string;
  name: string;
  linesCount?: number;
  description?: string;
}

export interface FactoryUnitItem {
  id: string;
  code: string;
  name: string;
  campus: string;
  description: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'EXPANSION' | 'INACTIVE';
  totalMachines: number;
  totalLines: number;
  headOfMaintenance: string;
  contactPhone: string;
  zones?: FactoryUnitZoneItem[];
}

const INITIAL_FACTORY_UNITS: FactoryUnitItem[] = FACTORY_UNITS.filter(unit => unit.id !== 'All Units').map(unit => ({
  id: unit.id, code: unit.id, name: unit.name, campus: '', description: '', status: 'ACTIVE',
  totalMachines: 0, totalLines: 0, headOfMaintenance: '', contactPhone: '',
  zones: getZonesForUnit(unit.id).map(zone => ({ id: zone.id, name: zone.name })),
}));

// ─── DEPARTMENT DATA MODEL ───
export interface DepartmentItem {
  navigation?: string[];
  id: string;
  name: string;
  badge?: string;
  description: string;
  userCount: number;
  kpi1Name: string;
  kpi1Type: string;
  kpi1Weight: number;
  kpi2Name: string;
  kpi2Type: string;
  kpi2Weight: number;
  kpi3Name: string;
  kpi3Type: string;
  kpi3Weight: number;
}

// All data removed from department page as requested by user
const INITIAL_DEPARTMENTS: DepartmentItem[] = [];


export type SettingsTab = 'DEPARTMENTS' | 'UNITS' | 'USERS' | 'KPI' | 'TELEGRAM';

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
  slaOnTimeRate: number;
  qualityScore: number;
  kpiScore: number;
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

function SettingsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const router = useRouter();

  const { user: currentUser, role: currentRole } = useAuth();
  const { showToast } = useToast();
  const isAdmin = currentRole === 'ADMIN' || currentUser?.role === 'ADMIN';

  // Active Settings Tab
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (tabParam === 'USERS') return 'USERS';
    if (tabParam === 'UNITS') return 'UNITS';
    if (tabParam === 'KPI') return 'KPI';
    if (tabParam === 'TELEGRAM') return 'TELEGRAM';
    return 'DEPARTMENTS';
  });

  // ─── Telegram Bot Alerts State ───
  const [serverTelegramConfig, setServerTelegramConfig] = useState<{
    configured: boolean;
    botToken: string;
    botUsername: string;
    unit1ChatId: string;
    unit2ChatId: string;
    adminChatId: string;
  } | null>(null);

  const [telegramBotToken, setTelegramBotToken] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return '';
    }
    return '';
  });
  const [telegramUnit1ChatId, setTelegramUnit1ChatId] = useState('');
  const [telegramAdminChatId, setTelegramAdminChatId] = useState('');
  const [telegramUnit2ChatId, setTelegramUnit2ChatId] = useState('');
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [isTokenVisible, setIsTokenVisible] = useState(false);
  const [showTelegramCredentials, setShowTelegramCredentials] = useState(false);
  const [testTargetChannel, setTestTargetChannel] = useState<'UNIT1' | 'UNIT2' | 'ADMIN'>('UNIT1');
  const [testCustomMessage, setTestCustomMessage] = useState<string>('Test alert: verifying Telegram message delivery from TexTech CMMS.');
  const [telegramStatusMessage, setTelegramStatusMessage] = useState<{
    status: 'SENT' | 'FAILED';
    message: string;
    targetName: string;
    timestamp: string;
    messageId?: number | string;
  } | null>(null);

  // Auto-fetch server environment credentials so user is NEVER prompted every time
  useEffect(() => {
    fetch('/api/telegram')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setServerTelegramConfig(data);
          // If token not set or matches server, keep synced
          setTelegramBotToken((prev) => {
            if (!prev || prev.trim() === '') return data.botToken || '';
            return prev;
          });
          setTelegramUnit1ChatId(data.unit1ChatId || '');
          setTelegramUnit2ChatId(data.unit2ChatId || '');
          setTelegramAdminChatId(data.adminChatId || '');
        }
      })
      .catch((err) => console.warn('Could not auto-fetch telegram config:', err));
  }, []);

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTelegramStatusMessage(null);

    const targetName = {
      UNIT1: 'Unit 1 Maintenance Group',
      UNIT2: 'Unit 2 Maintenance Group',
      ADMIN: 'Admin Personal Direct',
    }[testTargetChannel];

    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST',
          targetChannel: testTargetChannel,
          payload: {
            unit: testTargetChannel === 'UNIT2' ? 'UNIT - 2' : 'UNIT - 1',
            issue: testCustomMessage.trim() || 'Bot message delivery test verified.',
          },
        }),
      });
      const data = await res.json();
      const nowStr = new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      if (data.success) {
        setTelegramStatusMessage({
          status: 'SENT',
          message: 'Message sent successfully to Telegram!',
          targetName,
          timestamp: nowStr,
          messageId: data.messageId,
        });
        showToast('Telegram message sent successfully!', 'success');
      } else {
        setTelegramStatusMessage({
          status: 'FAILED',
          message: data.error || 'Failed to send message to Telegram. Check Bot Token or Chat permissions.',
          targetName,
          timestamp: nowStr,
        });
        showToast(data.error || 'Telegram message not sent', 'error');
      }
    } catch (err: any) {
      const nowStr = new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setTelegramStatusMessage({
        status: 'FAILED',
        message: err.message || 'Network error reaching Telegram API',
        targetName,
        timestamp: nowStr,
      });
      showToast('Network error contacting Telegram', 'error');
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleSaveTelegramConfig = async () => {
    try {
      const response = await fetch('/api/telegram', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SAVE', botToken: telegramBotToken.trim(), unit1ChatId: telegramUnit1ChatId.trim(), unit2ChatId: telegramUnit2ChatId.trim(), adminChatId: telegramAdminChatId.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to save Telegram settings.');
      const configResponse = await fetch('/api/telegram');
      const config = await configResponse.json();
      if (!configResponse.ok || !config.success) throw new Error('Unable to refresh Telegram settings.');
      setServerTelegramConfig(config);
      setTelegramUnit1ChatId(config.unit1ChatId || '');
      setTelegramUnit2ChatId(config.unit2ChatId || '');
      setTelegramAdminChatId(config.adminChatId || '');
      tenantPreferences.removeItem('cmms_telegram_bot_token');
      setTelegramBotToken('');
      showToast('Telegram configuration saved for your company.', 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to save Telegram configuration.', 'error'); }
  };

  const handleResetTelegramDefaults = () => {
    if (serverTelegramConfig) {
      setTelegramBotToken('');
      setTelegramUnit1ChatId(serverTelegramConfig.unit1ChatId || '');
      setTelegramUnit2ChatId(serverTelegramConfig.unit2ChatId || '');
      setTelegramAdminChatId(serverTelegramConfig.adminChatId || '');
      if (typeof window !== 'undefined') {
        tenantPreferences.removeItem('cmms_telegram_bot_token');
        tenantPreferences.removeItem('cmms_telegram_unit1_chat');
        tenantPreferences.removeItem('cmms_telegram_unit2_chat');
        tenantPreferences.removeItem('cmms_telegram_admin_chat');
      }
      showToast('Reset to server default configuration (@Assetmbot)', 'info');
    }
  };

  // Departments State (All preset/dummy items cleared)
  const [departments, setDepartments] = useState<DepartmentItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = tenantPreferences.getItem('cmms_settings_departments');
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return INITIAL_DEPARTMENTS;
  });

  const [savingDepartment, setSavingDepartment] = useState(false);

  useEffect(() => {
    if (!currentUser?.companySlug) return;
    const controller = new AbortController();
    apiFetch('/api/departments?manage', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load departments.');
        const { departments: saved } = await response.json() as { departments: DepartmentItem[] };
        const legacy = JSON.parse(tenantPreferences.getItem('cmms_settings_departments') || '[]') as DepartmentItem[];
        if (!controller.signal.aborted) setDepartments([
          ...saved,
          ...legacy.filter(item => !saved.some(dept => dept.id === item.id || dept.name.toLowerCase() === item.name.toLowerCase())),
        ]);
      })
      .catch(() => {
        if (!controller.signal.aborted) showToast('Unable to load shared departments.', 'error');
      });
    return () => controller.abort();
  }, [currentUser?.companySlug, showToast]);

  const persistDepartment = async (id: string, item?: DepartmentItem) => {
    setSavingDepartment(true);
    try {
      const response = await apiFetch(item ? '/api/departments' : `/api/departments?id=${encodeURIComponent(id)}`, {
        method: item ? 'PUT' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: item ? JSON.stringify({ ...item, navigation: item.navigation ?? [] }) : undefined,
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Unable to save department.');
      setDepartments(previous => item
        ? [{ ...item, name: item.name.trim() }, ...previous.filter(dept => dept.id !== id)]
        : previous.filter(dept => dept.id !== id));
      try {
        const legacy = JSON.parse(tenantPreferences.getItem('cmms_settings_departments') || '[]') as DepartmentItem[];
        tenantPreferences.setItem('cmms_settings_departments', JSON.stringify(legacy.filter(dept => dept.id !== id)));
      } catch { /* The department is already saved. */ }
      window.dispatchEvent(new Event(departmentNavigationChanged));
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save department.', 'error');
      return false;
    } finally {
      setSavingDepartment(false);
    }
  };

  // Add Department Modal
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [newDeptNavigation, setNewDeptNavigation] = useState<string[]>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptUsers, setNewDeptUsers] = useState<number>(0);
  const [newDeptKpi1Weight, setNewDeptKpi1Weight] = useState(40);
  const [newDeptKpi2Weight, setNewDeptKpi2Weight] = useState(30);
  const [newDeptKpi3Weight, setNewDeptKpi3Weight] = useState(30);

  // Edit Department Modal
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);

  // ─── Factory Units State & Modals ───
  const [factoryUnits, setFactoryUnits] = useState<FactoryUnitItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = tenantPreferences.getItem('cmms_settings_factory_units');
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return INITIAL_FACTORY_UNITS;
  });

  const saveFactoryUnits = (items: FactoryUnitItem[]) => {
    setFactoryUnits(items);
    try {
      tenantPreferences.setItem('cmms_settings_factory_units', JSON.stringify(items));
      window.dispatchEvent(new Event('cmms_settings_factory_units_changed'));
    } catch {
      // ignore
    }
  };

  // Add Factory Unit Modal
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitCampus, setNewUnitCampus] = useState('');
  const [newUnitDesc, setNewUnitDesc] = useState('');
  const [newUnitStatus, setNewUnitStatus] = useState<'ACTIVE' | 'MAINTENANCE' | 'EXPANSION' | 'INACTIVE'>('ACTIVE');
  const [newUnitMachines, setNewUnitMachines] = useState<number>(0);
  const [newUnitLines, setNewUnitLines] = useState<number>(6);
  const [newUnitHead, setNewUnitHead] = useState('');
  const [newUnitPhone, setNewUnitPhone] = useState('');

  // Edit Factory Unit Modal
  const [editingUnit, setEditingUnit] = useState<FactoryUnitItem | null>(null);
  const [editUnitCode, setEditUnitCode] = useState('');
  const [editUnitName, setEditUnitName] = useState('');
  const [editUnitCampus, setEditUnitCampus] = useState('');
  const [editUnitDesc, setEditUnitDesc] = useState('');
  const [editUnitStatus, setEditUnitStatus] = useState<'ACTIVE' | 'MAINTENANCE' | 'EXPANSION' | 'INACTIVE'>('ACTIVE');
  const [editUnitMachines, setEditUnitMachines] = useState<number>(0);
  const [editUnitLines, setEditUnitLines] = useState<number>(0);
  const [editUnitHead, setEditUnitHead] = useState('');
  const [editUnitPhone, setEditUnitPhone] = useState('');

  // Add Zone Modal (Multi-Zone Manager - Option 3)
  const [zoneModalUnit, setZoneModalUnit] = useState<FactoryUnitItem | null>(null);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneLines, setNewZoneLines] = useState<number>(8);
  const [newZoneDesc, setNewZoneDesc] = useState('');

  // Edit Zone Modal State
  const [editingZone, setEditingZone] = useState<{ unit: FactoryUnitItem; zone: FactoryUnitZoneItem } | null>(null);
  const [editZoneName, setEditZoneName] = useState('');
  const [editZoneLines, setEditZoneLines] = useState<number>(8);
  const [editZoneDesc, setEditZoneDesc] = useState('');

  // Selected Unit for Unit -> Zone drilldown view
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

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
  const [userUnitFilter, setUserUnitFilter] = useState<string>('ALL');

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // New User Form Fields
  const [newRole, setNewRole] = useState<UserRole>(() => departments[0]?.name || '');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newTitle, setNewTitle] = useState(() => (departments[0] ? `${departments[0].name} Specialist` : 'Staff'));
  const [newDepartment, setNewDepartment] = useState(() => departments[0]?.name || '');
  const [newPhone, setNewPhone] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState(`EMP-${Math.floor(100 + Math.random() * 900)}`);
  const [newPassword, setNewPassword] = useState('');
  const [newUnit, setNewUnit] = useState<string>('All Units');
  const [newZones, setNewZones] = useState<string[]>([]);
  const [isNewZoneDropdownOpen, setIsNewZoneDropdownOpen] = useState(false);
  const newZoneDropdownRef = useRef<HTMLDivElement>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('MECHANIC');
  const [editTitle, setEditTitle] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editUnit, setEditUnit] = useState<string>('All Units');
  const [editZones, setEditZones] = useState<string[]>([]);
  const [isEditZoneDropdownOpen, setIsEditZoneDropdownOpen] = useState(false);
  const editZoneDropdownRef = useRef<HTMLDivElement>(null);
  const [editStatus, setEditStatus] = useState<string>('ACTIVE');
  const [editPassword, setEditPassword] = useState('');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Helper to determine if a user/department is a mechanic
  const isMechanicRole = (role?: string, dept?: string, title?: string) => {
    const r = (role || '').toLowerCase();
    const d = (dept || '').toLowerCase();
    const t = (title || '').toLowerCase();
    return r.includes('mechanic') || d.includes('mechanic') || t.includes('mechanic');
  };

  // Helper to get available zones for a selected unit
  const getAvailableZonesForUnit = (unitCode: string) => {
    if (!unitCode || unitCode === 'All Units') return [];
    const found = factoryUnits.find((fu) => fu.code === unitCode || fu.id === unitCode);
    if (found?.zones && found.zones.length > 0) {
      return found.zones.map((z) => ({
        id: z.id || z.name,
        name: z.name || z.id,
        linesCount: z.linesCount,
        description: z.description,
      }));
    }
    const fallback = getZonesForUnit(unitCode);
    return fallback.map((z) => ({
      id: z.id,
      name: z.name,
      linesCount: z.defaultLines?.length || 8,
      description: z.description,
    }));
  };

  // Close zone dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newZoneDropdownRef.current && !newZoneDropdownRef.current.contains(e.target as Node)) {
        setIsNewZoneDropdownOpen(false);
      }
      if (editZoneDropdownRef.current && !editZoneDropdownRef.current.contains(e.target as Node)) {
        setIsEditZoneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setNewDepartment(role);
    if (isMechanicRole(role, role, '')) {
      if ((!newUnit || newUnit === 'All Units') && factoryUnits.length > 0) {
        setNewUnit(factoryUnits[0].code);
      }
    }
    switch (role) {
      case 'ADMIN':
        setNewTitle('Plant Administrator & Asset Director');
        setNewDepartment('Factory Operations & Admin');
        break;
      case 'CEO':
        setNewTitle('Chief Executive Officer (Managing Director)');
        setNewDepartment('Executive Directorate');
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
      default: {
        const matchedDept = departments.find(
          (d) => d.name.toLowerCase() === (role as string).toLowerCase()
        );
        setNewTitle(matchedDept ? `${matchedDept.name} Specialist` : `${role} Staff`);
        setNewDepartment(matchedDept ? matchedDept.name : (role as string));
        break;
      }
    }
  };

  // ─── Department Handlers ───
  const createQuickDepartment = async (name: string) => {
    const cleanName = name.trim();
    if (!cleanName || departments.some(department => department.name.toLowerCase() === cleanName.toLowerCase())) {
      showToast('Enter a unique department name.', 'warning');
      return false;
    }
    const department: DepartmentItem = {
      id: `dept-${crypto.randomUUID()}`, name: cleanName, navigation: departmentDefaultNavigation(cleanName),
      description: '', userCount: 0,
      kpi1Name: 'Stage on time', kpi1Type: 'auto - on time', kpi1Weight: 40,
      kpi2Name: 'Stage completion', kpi2Type: 'auto - completion', kpi2Weight: 30,
      kpi3Name: 'Quality of work', kpi3Type: 'manual', kpi3Weight: 30,
    };
    const saved = await persistDepartment(department.id, department);
    if (saved) showToast(`Team "${cleanName}" added.`, 'success');
    return saved;
  };
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) {
      showToast('Department name is required', 'error');
      return;
    }
    const created: DepartmentItem = {
      id: `dept-${crypto.randomUUID()}`,
      navigation: newDeptNavigation,
      name: newDeptName.trim(),
      description: newDeptDesc.trim(),
      userCount: Number(newDeptUsers) || 0,
      kpi1Name: 'Stage on time',
      kpi1Type: 'auto - on time',
      kpi1Weight: Number(newDeptKpi1Weight) || 40,
      kpi2Name: 'Stage completion',
      kpi2Type: 'auto - completion',
      kpi2Weight: Number(newDeptKpi2Weight) || 30,
      kpi3Name: 'Quality of work',
      kpi3Type: 'manual',
      kpi3Weight: Number(newDeptKpi3Weight) || 30,
    };
    if (!await persistDepartment(created.id, created)) return;
    setNewDeptNavigation([]);
    showToast(`Department "${created.name}" created successfully!`, 'success');
    setIsAddDeptModalOpen(false);
    setNewDeptName('');
    setNewDeptDesc('');
    setNewDeptUsers(0);
  };

  const handleSaveEditDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    if (!editingDept.name.trim()) {
      showToast('Department name cannot be empty', 'error');
      return;
    }
    if (!await persistDepartment(editingDept.id, editingDept)) return;
    showToast(`Department "${editingDept.name}" updated!`, 'success');
    setEditingDept(null);
  };

  const handleDeleteDept = async (id: string) => {
    const target = departments.find((d) => d.id === id);
    if (!target) return;
    if (window.confirm(`Are you sure you want to remove department "${target.name}"?`)) {
      if (!await persistDepartment(id)) return;
      showToast(`Department "${target.name}" removed`, 'success');
    }
  };

  // ─── Factory Units Handlers ───
  const handleOpenAddUnit = () => {
    const nextNum = factoryUnits.length + 1;
    setNewUnitCode(`UNIT-${nextNum}`);
    setNewUnitName(`Plant Unit ${nextNum} — Industrial Campus`);
    setNewUnitCampus('Tirupur District, Tamil Nadu');
    setNewUnitDesc('Apparel stitching and finishing production lines.');
    setNewUnitStatus('ACTIVE');
    setNewUnitMachines(120);
    setNewUnitLines(6);
    setNewUnitHead('');
    setNewUnitPhone('');
    setIsAddUnitModalOpen(true);
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim() || !newUnitCode.trim()) {
      showToast('Please provide both Unit Code and Name', 'error');
      return;
    }
    const cleanCode = newUnitCode.trim().toUpperCase();
    if (factoryUnits.some((u) => u.code.toUpperCase() === cleanCode)) {
      showToast(`A factory unit with code "${cleanCode}" already exists`, 'error');
      return;
    }
    const created: FactoryUnitItem = {
      id: cleanCode,
      code: cleanCode,
      name: newUnitName.trim(),
      campus: newUnitCampus.trim(),
      description: newUnitDesc.trim(),
      status: newUnitStatus,
      totalMachines: Number(newUnitMachines) || 0,
      totalLines: Number(newUnitLines) || 0,
      headOfMaintenance: newUnitHead.trim(),
      contactPhone: newUnitPhone.trim(),
    };
    const updated = [...factoryUnits, created];
    saveFactoryUnits(updated);
    showToast(`Factory unit "${created.name}" created successfully!`, 'success');
    setIsAddUnitModalOpen(false);
    setSelectedUnitId(created.id);
  };

  const handleOpenEditUnit = (unit: FactoryUnitItem) => {
    setEditingUnit(unit);
    setEditUnitCode(unit.code);
    setEditUnitName(unit.name);
    setEditUnitCampus(unit.campus || '');
    setEditUnitDesc(unit.description || '');
    setEditUnitStatus(unit.status || 'ACTIVE');
    setEditUnitMachines(unit.totalMachines || 0);
    setEditUnitLines(unit.totalLines || 0);
    setEditUnitHead(unit.headOfMaintenance || '');
    setEditUnitPhone(unit.contactPhone || '');
  };

  const handleSaveEditUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    if (!editUnitName.trim()) {
      showToast('Name is required', 'error');
      return;
    }
    const updated = factoryUnits.map((u) => {
      if (u.id === editingUnit.id) {
        return {
          ...u,
          name: editUnitName.trim(),
          campus: editUnitCampus.trim(),
          description: editUnitDesc.trim(),
          status: editUnitStatus,
          totalMachines: Number(editUnitMachines) || 0,
          totalLines: Number(editUnitLines) || 0,
          headOfMaintenance: editUnitHead.trim(),
          contactPhone: editUnitPhone.trim(),
        };
      }
      return u;
    });
    saveFactoryUnits(updated);
    showToast(`Factory unit "${editUnitName.trim()}" updated successfully!`, 'success');
    setEditingUnit(null);
  };

  const handleDeleteUnit = (unit: FactoryUnitItem) => {
    if (!window.confirm(`Are you sure you want to delete unit "${unit.name}" (${unit.code})?`)) {
      return;
    }
    const updated = factoryUnits.filter((u) => u.id !== unit.id);
    saveFactoryUnits(updated);
    if (selectedUnitId === unit.id || selectedUnitId === unit.code) {
      setSelectedUnitId(null);
    }
    showToast(`Unit "${unit.name}" removed`, 'info');
  };

  // ─── Multi-Zone Helpers & Handlers ───
  const getUnitZones = (u: FactoryUnitItem): FactoryUnitZoneItem[] => {
    if (Array.isArray(u.zones)) {
      const zones = new Map<string, FactoryUnitZoneItem>();
      for (const zone of u.zones) {
        const key = /^(?:NETHAJI|NETAJI)(?:\s|$)/i.test(zone.name) ? 'NETHAJI' : zone.name.replace(/\s*\([^)]*\)\s*$/, '').trim().toUpperCase();
        const previous = zones.get(key);
        if (!previous || zone.id === key) zones.set(key, { ...zone, name: key === 'NETHAJI' ? key : zone.name });
      }
      return [...zones.values()];
    }
    if (u.code === 'UNIT - 1') {
      return [
        { id: 'NETHAJI', name: 'NETHAJI (Main Sewing Complex)', linesCount: 8, description: 'Sewing lines 01–08' },
        { id: 'NETHAJI - Cutting Bay', name: 'NETHAJI - Cutting & Fusing Bay', linesCount: 4, description: 'Cutting spreading tables' },
        { id: 'NETHAJI - Finishing', name: 'NETHAJI - Finishing & Packing', linesCount: 4, description: 'Ironing & packing lines' },
      ];
    }
    if (u.code === 'UNIT-2') {
      return [
        { id: 'PEACOCK', name: 'PEACOCK (Main Sewing Floor)', linesCount: 8, description: 'Sewing lines 01–08' },
      ];
    }
    return [{ id: `${u.code}-Z1`, name: `${u.name} Zone 1`, linesCount: u.totalLines || 6, description: 'Primary manufacturing bay' }];
  };

  const handleOpenAddZone = (unit: FactoryUnitItem) => {
    setZoneModalUnit(unit);
    setNewZoneName('');
    setNewZoneLines(8);
    setNewZoneDesc('');
  };

  const handleSaveNewZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneModalUnit) return;
    const cleanName = newZoneName.trim();
    if (!cleanName) {
      showToast('Zone name is required', 'error');
      return;
    }

    const currentZones = getUnitZones(zoneModalUnit);

    if (
      currentZones.some(
        (z) => z.name.toLowerCase() === cleanName.toLowerCase() || z.id.toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      showToast(`A zone named "${cleanName}" already exists in ${zoneModalUnit.code}`, 'error');
      return;
    }

    const createdZone: FactoryUnitZoneItem = {
      id: cleanName,
      name: cleanName,
      linesCount: Number(newZoneLines) || 8,
      description: newZoneDesc.trim() || undefined,
    };

    const updatedZones = [...currentZones, createdZone];
    const updated = factoryUnits.map((u) => {
      if (u.id === zoneModalUnit.id) {
        return {
          ...u,
          zones: updatedZones,
        };
      }
      return u;
    });

    saveFactoryUnits(updated);
    showToast(`Zone "${cleanName}" added to ${zoneModalUnit.code}!`, 'success');
    setZoneModalUnit(null);
  };

  const handleOpenEditZone = (unit: FactoryUnitItem, zone: FactoryUnitZoneItem) => {
    setEditingZone({ unit, zone });
    setEditZoneName(zone.name);
    setEditZoneLines(zone.linesCount || 8);
    setEditZoneDesc(zone.description || '');
  };

  const handleSaveEditZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone) return;
    const cleanName = editZoneName.trim();
    if (!cleanName) {
      showToast('Zone name is required', 'error');
      return;
    }

    const { unit, zone } = editingZone;
    const currentZones = getUnitZones(unit);

    if (
      currentZones.some(
        (z) => z.id !== zone.id && z.name.toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      showToast(`Another zone named "${cleanName}" already exists in ${unit.code}`, 'error');
      return;
    }

    const updatedZones = currentZones.map((z) => {
      if (z.id === zone.id) {
        return {
          ...z,
          name: cleanName,
          linesCount: Number(editZoneLines) || 8,
          description: editZoneDesc.trim() || undefined,
        };
      }
      return z;
    });

    const updated = factoryUnits.map((u) => {
      if (u.id === unit.id) {
        return {
          ...u,
          zones: updatedZones,
        };
      }
      return u;
    });

    saveFactoryUnits(updated);
    showToast(`Zone "${cleanName}" updated successfully!`, 'success');
    setEditingZone(null);
  };

  const handleDeleteZone = (unit: FactoryUnitItem, zoneId: string) => {
    const currentZones = getUnitZones(unit);

    const targetZone = currentZones.find((z) => z.id === zoneId);
    if (!window.confirm(`Are you sure you want to remove zone "${targetZone?.name || zoneId}" from ${unit.code}?`)) {
      return;
    }
    const updatedZones = currentZones.filter((z) => z.id !== zoneId);
    const updated = factoryUnits.map((u) => {
      if (u.id === unit.id) {
        return {
          ...u,
          zones: updatedZones,
        };
      }
      return u;
    });
    saveFactoryUnits(updated);
    showToast(`Zone removed from ${unit.code}`, 'info');
  };

  // ─── User Handlers ───
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
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }

    const isMech = isMechanicRole(newRole, newDepartment, newTitle);
    if (isMech && newUnit !== 'All Units') {
      if (!newUnit) {
        showToast('Please select a specific plant unit for the mechanic', 'error');
        return;
      }
      if (newZones.length === 0) {
        showToast('Please select at least one zone for the mechanic', 'error');
        return;
      }
    }

    setIsSubmittingNewUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          username: newUsername.trim(),
          role: newRole,
          title: newTitle.trim(),
          department: newDepartment.trim(),
          phone: newPhone.trim(),
          employeeId: newEmployeeId.trim(),
          password: newPassword.trim(),
          unit: newUnit,
          zones: isMech && newUnit !== 'All Units' ? newZones : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user account');
      }

      showToast(`User ${data.user.name} (${data.user.role}) provisioned successfully!`, 'success');
      setIsAddUserModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewUsername('');
      setNewPassword('');
      setNewPhone('');
      setNewZones([]);
      setIsNewZoneDropdownOpen(false);
      setNewEmployeeId(`EMP-${Math.floor(100 + Math.random() * 900)}`);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Error creating user', 'error');
    } finally {
      setIsSubmittingNewUser(false);
    }
  };

  const handleOpenEditUser = (u: UserProfile) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditUsername(u.username || '');
    setEditRole(u.role);
    setEditTitle(u.title || '');
    setEditDepartment(u.department || '');
    setEditPhone(u.phone || '');
    setEditEmployeeId(u.employeeId || '');
    setEditUnit(u.unit || 'All Units');
    setEditZones(Array.isArray(u.zones) ? [...u.zones] : []);
    setIsEditZoneDropdownOpen(false);
    setEditStatus(u.status || 'ACTIVE');
    setEditPassword('');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const isMech = isMechanicRole(editRole, editDepartment, editTitle);
    if (isMech && editUnit !== 'All Units') {
      if (!editUnit) {
        showToast('Please select a specific plant unit for the mechanic', 'error');
        return;
      }
      if (editZones.length === 0) {
        showToast('Please select at least one zone for the mechanic', 'error');
        return;
      }
    }

    setIsUpdatingUser(true);
    try {
      const updatePayload: any = {
        name: editName.trim(),
        role: editRole,
        title: editTitle.trim(),
        department: editDepartment.trim(),
        phone: editPhone.trim(),
        employeeId: editEmployeeId.trim(),
        username: editUsername.trim(),
        unit: editUnit,
        zones: isMech && editUnit !== 'All Units' ? editZones : [],
        status: editStatus,
      };

      if (editPassword.trim()) {
        if (editPassword.trim().length < 8) {
          showToast('New password must be at least 8 characters', 'error');
          setIsUpdatingUser(false);
          return;
        }
        updatePayload.password = editPassword.trim();
      }

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: editingUser.uid, ...updatePayload }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      window.dispatchEvent(new Event(departmentNavigationChanged));
      showToast(`User profile for ${editName} updated successfully!`, 'success');
      setEditingUser(null);
      setEditZones([]);
      setIsEditZoneDropdownOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Error updating user profile', 'error');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleDeleteUser = async (u: UserProfile) => {
    if (u.uid === currentUser?.uid) {
      showToast('You cannot delete your own active administrator account!', 'error');
      return;
    }

    if (u.role === 'CEO') {
      showToast('System Director & CEO accounts are protected from deletion.', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete ${u.name} (${u.email})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users?uid=${encodeURIComponent(u.uid)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      showToast(`User ${u.name} deleted successfully`, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Error deleting user', 'error');
    }
  };

  const handleOpenResetPassword = (u: UserProfile) => {
    setPasswordModalUser(u);
    setModalNewPassword('');
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    if (modalNewPassword.trim().length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: passwordModalUser.uid, password: modalNewPassword.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      showToast(`Password for ${passwordModalUser.name} reset successfully!`, 'success');
      setPasswordModalUser(null);
      setModalNewPassword('');
    } catch (err: any) {
      showToast(err.message || 'Error resetting password', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.employeeId?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.username?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.department?.toLowerCase().includes(userSearchQuery.toLowerCase());

      const matchesRole =
        userRoleFilter === 'ALL' ||
        u.role?.toUpperCase() === userRoleFilter.toUpperCase() ||
        u.role === userRoleFilter;

      const matchesUnitFilter =
        userUnitFilter === 'ALL' ||
        matchesUnit(u.unit, userUnitFilter) ||
        u.unit === userUnitFilter ||
        !u.unit;

      return matchesSearch && matchesRole && matchesUnitFilter;
    });
  }, [users, userSearchQuery, userRoleFilter, userUnitFilter]);

  // Worker KPI Data Generator
  const workerKpiList: WorkerKpiData[] = useMemo(() => {
    const staticMechanics = FACTORY_MECHANICS_ROSTER.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.trade === 'MECHANIC' ? 'Sewing Mechanic' : m.trade === 'ELECTRICIAN' ? 'Plant Electrician' : 'Floor Supervisor',
      trade: m.trade,
      shift: m.shift,
      specialty: m.specialty,
      assignedLines: m.assignedLines,
      status: m.status,
      phone: m.phone,
      avatarColor: m.trade === 'MECHANIC' ? 'bg-indigo-100 text-indigo-700' : m.trade === 'ELECTRICIAN' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
      experienceYears: m.experienceYears,
      isDynamicUser: false,
    }));

    const dynamicTechs = users
      .filter((u) => {
        const r = String(u.role || '').toUpperCase();
        return ['MECHANIC', 'SENIOR_MECHANIC', 'ELECTRICIAN', 'SENIOR_ELECTRICIAN'].includes(r);
      })
      .map((u) => {
        const rUpper = String(u.role || '').toUpperCase();
        const isElec = rUpper.includes('ELECTRICIAN');
        return {
          id: u.uid,
          name: u.name,
          role: u.title || (isElec ? 'Plant Electrician' : 'Sewing Mechanic'),
          trade: (isElec ? 'ELECTRICIAN' : 'MECHANIC') as 'MECHANIC' | 'ELECTRICIAN',
          shift: 'General (08:30 - 17:30)',
          specialty: u.department || 'Maintenance Floor',
          assignedLines: u.unit && u.unit !== 'All Units' ? `${u.unit} Lines` : 'Plant Lines 01–08',
          status: (u.status === 'INACTIVE' ? 'STANDBY' : 'ON_DUTY') as 'ON_DUTY' | 'STANDBY',
          phone: u.phone || '+91 9842X XXXXX',
          avatarColor: isElec ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700',
          experienceYears: 5,
          isDynamicUser: true,
        };
      });

    const combined = [...staticMechanics];
    dynamicTechs.forEach((dt) => {
      if (!combined.some((c) => c.name.toLowerCase() === dt.name.toLowerCase())) {
        combined.push(dt as any);
      }
    });

    return combined.map((worker) => {
      const matchedTickets = repairs.filter(
        (r) =>
          r.attendedBy === worker.name ||
          (r as any).assignedTo === worker.name ||
          (r as any).technicianName === worker.name
      );

      const completedBreakdowns = matchedTickets.filter((r) => r.status === 'COMPLETED' && (r as any).type !== 'PPM').length;
      const completedPpms = matchedTickets.filter((r) => r.status === 'COMPLETED' && (r as any).type === 'PPM').length;
      const totalResolved = completedBreakdowns + completedPpms;
      const totalAssigned = matchedTickets.length || Math.max(totalResolved, 12);

      let avgMttrMinutes = 32;
      const completedWithDuration = matchedTickets.filter((r) => r.status === 'COMPLETED' && r.completedAt && (r.reportedAt || (r as any).createdAt));
      if (completedWithDuration.length > 0) {
        const totalDurationMs = completedWithDuration.reduce((acc, curr) => {
          const start = new Date(curr.reportedAt || (curr as any).createdAt).getTime();
          const end = new Date(curr.completedAt!).getTime();
          return acc + Math.max(end - start, 10 * 60 * 1000);
        }, 0);
        avgMttrMinutes = Math.round(totalDurationMs / completedWithDuration.length / (1000 * 60));
      }

      const slaOnTimeRate = totalResolved > 0 ? Math.min(100, Math.max(78, Math.round(100 - avgMttrMinutes * 0.4))) : 92;
      const qualityScore = Math.min(100, Math.max(82, Math.round(85 + (worker.experienceYears || 4) * 1.8)));
      const kpiScore = Math.round(slaOnTimeRate * 0.4 + qualityScore * 0.35 + Math.min(100, totalResolved * 8) * 0.25);

      let rankTier: 'S' | 'A' | 'B' | 'C' = 'B';
      let rankLabel = 'Tier B • Reliable Technician';
      let rankBg = 'bg-blue-50';
      let rankText = 'text-blue-700';
      let rankBorder = 'border-blue-200';

      if (kpiScore >= 93) {
        rankTier = 'S';
        rankLabel = 'Tier S • Master Craftsman';
        rankBg = 'bg-amber-50';
        rankText = 'text-amber-800';
        rankBorder = 'border-amber-300';
      } else if (kpiScore >= 85) {
        rankTier = 'A';
        rankLabel = 'Tier A • High-Precision Tech';
        rankBg = 'bg-emerald-50';
        rankText = 'text-emerald-800';
        rankBorder = 'border-emerald-300';
      }

      return {
        id: worker.id,
        name: worker.name,
        roleTitle: worker.role,
        trade: (worker.trade || 'MECHANIC') as 'MECHANIC' | 'ELECTRICIAN' | 'SUPERVISOR',
        shift: worker.shift,
        specialty: worker.specialty,
        assignedLines: worker.assignedLines,
        status: worker.status,
        phone: worker.phone,
        avatarColor: worker.avatarColor,
        experienceYears: worker.experienceYears,
        totalAssigned,
        completedBreakdowns,
        completedPpms,
        totalResolved,
        avgMttrMinutes,
        slaOnTimeRate,
        qualityScore,
        kpiScore,
        rankBadge: {
          label: rankLabel,
          tier: rankTier,
          bgColor: rankBg,
          textColor: rankText,
          borderColor: rankBorder,
        },
        recentTickets: matchedTickets.slice(0, 5),
      };
    });
  }, [repairs, users]);

  const filteredKpiWorkers = useMemo(() => {
    return workerKpiList
      .filter((w) => {
        const matchesQuery =
          w.name.toLowerCase().includes(kpiSearchQuery.toLowerCase()) ||
          w.specialty.toLowerCase().includes(kpiSearchQuery.toLowerCase()) ||
          w.assignedLines.toLowerCase().includes(kpiSearchQuery.toLowerCase());
        const matchesTrade = kpiTradeFilter === 'ALL' || w.trade === kpiTradeFilter;
        return matchesQuery && matchesTrade;
      })
      .sort((a, b) => {
        if (kpiSortBy === 'SCORE_DESC') return b.kpiScore - a.kpiScore;
        if (kpiSortBy === 'TASKS_DESC') return b.totalResolved - a.totalResolved;
        if (kpiSortBy === 'MTTR_ASC') return a.avgMttrMinutes - b.avgMttrMinutes;
        return a.name.localeCompare(b.name);
      });
  }, [workerKpiList, kpiSearchQuery, kpiTradeFilter, kpiSortBy]);

  return (
    <div className="settings-page space-y-6" data-settings-tab={activeTab}>
      <h1 className="sr-only">Settings</h1>
      {/* ─────────────────────────────────────────────────────────────────────────
          HEADER SECTION & TABS
      ────────────────────────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────────────
          TAB SWITCHER (Departments, Factory Units, Users, KPI)
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
      <nav className="settings-reference-tabs" aria-label="Settings sections">
        {([{ id: 'USERS', label: 'Users (' + users.length + ')' }, { id: 'DEPARTMENTS', label: 'Teams / Departments (' + departments.length + ')' }, { id: 'UNITS', label: 'Units (' + factoryUnits.length + ')' }, { id: 'KPI', label: 'Technician Scorecards' }, { id: 'TELEGRAM', label: 'Telegram Alerts' }] as { id: SettingsTab; label: string }[]).map(tab => <button key={tab.id} type="button" aria-pressed={activeTab === tab.id} className={activeTab === tab.id ? 'is-active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
      </nav>
      <div className="flex items-center gap-2 shrink-0">
        {activeTab === 'DEPARTMENTS' && <button type="button" onClick={() => setIsAddDeptModalOpen(true)} className="settings-primary">Add Department</button>}
        {activeTab === 'UNITS' && <button type="button" onClick={handleOpenAddUnit} className="settings-primary">Add Factory Unit</button>}
        {activeTab === 'USERS' && <button type="button" className="settings-primary" onClick={() => { const field = document.getElementById('settings-new-user-name'); field?.scrollIntoView({ behavior: 'smooth', block: 'center' }); field?.focus({ preventScroll: true }); }}>Add new user</button>}
      </div>
      </div>
      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 1: DEPARTMENTS (All dummy data cleared as requested)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'DEPARTMENTS' && <DepartmentSettingsPanel departments={departments} saving={savingDepartment} onCreate={createQuickDepartment} onSave={department => persistDepartment(department.id, department)} onEdit={setEditingDept} onDelete={handleDeleteDept} />}
      {activeTab === 'UNITS' && <UnitSettingsPanel units={factoryUnits} machines={machines} repairs={repairs} onAdd={handleOpenAddUnit} onEdit={handleOpenEditUnit} onDelete={handleDeleteUnit} getZones={getUnitZones} onAddZone={handleOpenAddZone} onEditZone={handleOpenEditZone} onDeleteZone={handleDeleteZone} />}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 3: USER ACCOUNTS & PROVISIONING DESK
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'USERS' && <UserSettingsPanel showHeading={false} users={users} departments={departments} units={factoryUnits} companySlug={currentUser?.companySlug} actorRole={currentUser?.role || currentRole} currentUid={currentUser?.uid} loading={isLoadingUsers} onRefresh={fetchUsers} onEdit={handleOpenEditUser} onDelete={handleDeleteUser} onResetPassword={handleOpenResetPassword} onAddDepartment={() => setActiveTab('DEPARTMENTS')} />}

      {activeTab === 'DEPARTMENTS' && <UserNavigationSettings />}

      {activeTab === 'KPI' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search technician by name or assigned line..."
                value={kpiSearchQuery}
                onChange={(e) => setKpiSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={kpiTradeFilter}
                onChange={(e) => setKpiTradeFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">All Crafts ({workerKpiList.length})</option>
                <option value="MECHANIC">Sewing Mechanics</option>
                <option value="ELECTRICIAN">Electricians</option>
                <option value="SUPERVISOR">Floor Supervisors</option>
              </select>

              <select
                value={kpiSortBy}
                onChange={(e) => setKpiSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="SCORE_DESC">Rank: Highest KPI</option>
                <option value="TASKS_DESC">Rank: Most Tasks Resolved</option>
                <option value="MTTR_ASC">Rank: Fastest MTTR</option>
                <option value="NAME_ASC">Name (A-Z)</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4">Trade & Assigned Lines</th>
                    <th className="py-3 px-4 text-center">Breakdowns</th>
                    <th className="py-3 px-4 text-center">PPM Done</th>
                    <th className="py-3 px-4 text-center">Avg MTTR</th>
                    <th className="py-3 px-4 text-center">SLA Rate</th>
                    <th className="py-3 px-4 text-center">KPI Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredKpiWorkers.map((w, idx) => (
                    <tr key={w.id} className="hover:bg-slate-50/60 transition group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="w-5 text-center text-xs font-black text-slate-400">#{idx + 1}</span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${w.avatarColor}`}>
                            {w.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{w.name}</span>
                            <span className="text-[11px] text-slate-400">{w.roleTitle}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-700 block font-semibold">{w.trade}</span>
                        <span className="text-[11px] text-slate-400">{w.assignedLines}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-rose-50 text-rose-700 border border-rose-200">
                          {w.completedBreakdowns}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {w.completedPpms}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-700">
                        {w.avgMttrMinutes}m
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-slate-800">{w.slaOnTimeRate}%</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black border ${w.rankBadge.bgColor} ${w.rankBadge.textColor} ${w.rankBadge.borderColor}`}>
                          {w.kpiScore}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 5: TELEGRAM BROADCAST & UNIT 1 NOTIFICATIONS
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'TELEGRAM' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200/80 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="font-bold text-lg text-slate-900">Telegram Bot Notifications</h3>
                  {serverTelegramConfig?.configured ? (
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Bot configured
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                      Telegram setup required
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Test Telegram notification delivery to verify whether alerts are sending properly.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTelegramCredentials((prev) => !prev)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>{showTelegramCredentials ? 'Hide Bot Settings' : 'Edit Bot Settings'}</span>
              </button>
            </div>
          </div>

          {/* MAIN CARD: Dedicated Telegram Message Test */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-base text-slate-900">Message Delivery Test</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send a live test to verify if the Telegram bot delivers messages or encounters an error.
                </p>
              </div>
            </div>

            {/* Target Channel Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Recipient Group / Chat
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTestTargetChannel('UNIT1')}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    testTargetChannel === 'UNIT1'
                      ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-500/20 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-800">Unit 1 Group</span>
                    {testTargetChannel === 'UNIT1' && <BadgeCheck className="w-4 h-4 text-sky-600" />}
                  </div>
                  <span className="text-xs text-slate-500 block">Unit 1 Maintenance Chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTestTargetChannel('UNIT2')}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    testTargetChannel === 'UNIT2'
                      ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-500/20 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-800">Unit 2 Group</span>
                    {testTargetChannel === 'UNIT2' && <BadgeCheck className="w-4 h-4 text-sky-600" />}
                  </div>
                  <span className="text-xs text-slate-500 block">Unit 2 Maintenance Chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTestTargetChannel('ADMIN')}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    testTargetChannel === 'ADMIN'
                      ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-500/20 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-800">Admin Direct</span>
                    {testTargetChannel === 'ADMIN' && <BadgeCheck className="w-4 h-4 text-sky-600" />}
                  </div>
                  <span className="text-xs text-slate-500 block">Admin Personal Direct Chat</span>
                </button>
              </div>
            </div>

            {/* Test Message Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Test Message
              </label>
              <input
                type="text"
                value={testCustomMessage}
                onChange={(e) => setTestCustomMessage(e.target.value)}
                placeholder="Enter test message to send..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
              />
            </div>

            {/* Send Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isTestingTelegram}
                onClick={() => handleTestTelegram()}
                className="px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isTestingTelegram ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Test Message...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Test Message</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Message Delivery Status: Shows whether message is send or not */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Delivery Status
              </label>
              {telegramStatusMessage ? (
                telegramStatusMessage.status === 'SENT' ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start gap-3.5 shadow-2xs">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-emerald-900 uppercase tracking-wide">
                          Message Sent
                        </span>
                        <span className="text-xs bg-emerald-200 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full">
                          Success
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700 mt-1 font-medium">
                        Successfully delivered to <b>{telegramStatusMessage.targetName}</b> at {telegramStatusMessage.timestamp}.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-3.5 shadow-2xs">
                    <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <X className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-rose-900 uppercase tracking-wide">
                          Message Not Sent
                        </span>
                        <span className="text-xs bg-rose-200 text-rose-900 font-extrabold px-2 py-0.5 rounded-full">
                          Failed
                        </span>
                      </div>
                      <p className="text-xs text-rose-700 mt-1 font-medium">
                        {telegramStatusMessage.message} (Target: {telegramStatusMessage.targetName})
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Ready to test. Select a destination channel and click <b>Send Test Message</b> to verify whether the message is sent or not.</span>
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Bot Settings (Toggled via "Edit Bot Settings") */}
          {showTelegramCredentials && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-sky-600" />
                  <h4 className="font-bold text-sm text-slate-800">Bot Credentials & Target Channels</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetTelegramDefaults}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTelegramConfig}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                  >
                    Save Config
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Telegram Bot Token</label>
                  <div className="relative">
                    <input
                      type={isTokenVisible ? 'text' : 'password'}
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                      placeholder="e.g. 8815692743:AAFlm3w7Z9k..."
                      className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setIsTokenVisible(!isTokenVisible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {isTokenVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Unit 1 Chat ID</label>
                    <input
                      type="text"
                      value={telegramUnit1ChatId}
                      onChange={(e) => setTelegramUnit1ChatId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Unit 2 Chat ID</label>
                    <input
                      type="text"
                      value={telegramUnit2ChatId}
                      onChange={(e) => setTelegramUnit2ChatId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Admin Chat ID</label>
                    <input
                      type="text"
                      value={telegramAdminChatId}
                      onChange={(e) => setTelegramAdminChatId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: ADD DEPARTMENT
      ────────────────────────────────────────────────────────────────────────── */}
      {isAddDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90dvh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-xs bg-[#059669]" />
                <span>Add New Department</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDeptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={newDeptName}
                  onChange={(e) => { setNewDeptName(e.target.value); setNewDeptNavigation(departmentDefaultNavigation(e.target.value)); }}
                  placeholder="e.g. Sewing Assembly Line 1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#059669] outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  placeholder="e.g. Overlock and flatlock heavy garment assembly"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Allocated Users / Staff Count</label>
                <input
                  type="number"
                  min="0"
                  value={newDeptUsers}
                  onChange={(e) => setNewDeptUsers(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#059669] outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">KPI 1 Weight (%)</label>
                  <input
                    type="number"
                    value={newDeptKpi1Weight}
                    onChange={(e) => setNewDeptKpi1Weight(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">KPI 2 Weight (%)</label>
                  <input
                    type="number"
                    value={newDeptKpi2Weight}
                    onChange={(e) => setNewDeptKpi2Weight(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">KPI 3 Weight (%)</label>
                  <input
                    type="number"
                    value={newDeptKpi3Weight}
                    onChange={(e) => setNewDeptKpi3Weight(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-center font-bold"
                  />
                </div>
              </div>

              <DepartmentNavigationChecklist departmentName={newDeptName} selected={newDeptNavigation} onChange={setNewDeptNavigation} />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDeptModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDepartment}
                  className="px-4 py-2 font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: EDIT DEPARTMENT
      ────────────────────────────────────────────────────────────────────────── */}
      {editingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90dvh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-xs bg-[#059669]" />
                <span>Edit Department: {editingDept.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingDept(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDept} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={editingDept.name}
                  onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value, navigation: departmentDefaultNavigation(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#059669] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editingDept.description}
                  onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">User Count</label>
                <input
                  type="number"
                  min="0"
                  value={editingDept.userCount}
                  onChange={(e) => setEditingDept({ ...editingDept, userCount: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#059669] outline-none"
                />
              </div>

              <DepartmentNavigationChecklist departmentName={editingDept.name} selected={editingDept.navigation ?? departmentDefaultNavigation(editingDept.name)} onChange={navigation => setEditingDept({ ...editingDept, navigation })} />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDepartment}
                  className="px-4 py-2 font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: ADD FACTORY UNIT
      ────────────────────────────────────────────────────────────────────────── */}
      {isAddUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#059669]" />
                <span>Register Manufacturing Plant Unit</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUnitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Code *</label>
                  <input
                    type="text"
                    required
                    value={newUnitCode}
                    onChange={(e) => setNewUnitCode(e.target.value)}
                    placeholder="e.g. UNIT-3"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold focus:ring-2 focus:ring-[#059669] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Operational Status</label>
                  <select
                    value={newUnitStatus}
                    onChange={(e) => setNewUnitStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#059669] outline-none"
                  >
                    <option value="ACTIVE">ACTIVE (Operational)</option>
                    <option value="EXPANSION">EXPANSION (Setup Phase)</option>
                    <option value="MAINTENANCE">MAINTENANCE (Plant Overhaul)</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Plant Name / Zone *</label>
                <input
                  type="text"
                  required
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder="e.g. Plant Unit 3 — Avinashi Campus"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#059669] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Campus / Facility Location</label>
                <input
                  type="text"
                  value={newUnitCampus}
                  onChange={(e) => setNewUnitCampus(e.target.value)}
                  placeholder="e.g. SIPCOT Phase 2, Perundurai Road"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Machine Capacity</label>
                  <input
                    type="number"
                    min="0"
                    value={newUnitMachines}
                    onChange={(e) => setNewUnitMachines(parseInt(e.target.value, 10) || 0)}
                    placeholder="e.g. 150"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#059669] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Active Sewing Lines</label>
                  <input
                    type="number"
                    min="0"
                    value={newUnitLines}
                    onChange={(e) => setNewUnitLines(parseInt(e.target.value, 10) || 0)}
                    placeholder="e.g. 6"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#059669] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Maintenance In-Charge</label>
                  <input
                    type="text"
                    value={newUnitHead}
                    onChange={(e) => setNewUnitHead(e.target.value)}
                    placeholder="e.g. S. Murugesan (Sr. Engr)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={newUnitPhone}
                    onChange={(e) => setNewUnitPhone(e.target.value)}
                    placeholder="+91 9842X XXXXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#059669] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Scope</label>
                <textarea
                  rows={2}
                  value={newUnitDesc}
                  onChange={(e) => setNewUnitDesc(e.target.value)}
                  placeholder="Key operations or garment categories handled at this facility..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUnitModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save Factory Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: EDIT FACTORY UNIT
      ────────────────────────────────────────────────────────────────────────── */}
      {editingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs" onClick={() => setEditingUnit(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="unit-edit-title" className="settings-unit-edit-modal" onClick={event => event.stopPropagation()}>
            <div className="settings-unit-row"><h3 id="unit-edit-title">Edit {editingUnit.name}</h3><button type="button" aria-label="Close edit unit" onClick={() => setEditingUnit(null)}><X size={18} /></button></div>
            <form onSubmit={handleSaveEditUnit}>
              <div className="settings-unit-edit-grid">
                <label>Unit Name *<input required value={editUnitName} onChange={event => setEditUnitName(event.target.value)} autoFocus /></label>
                <label>Unit Code / ID<input value={editUnitCode} readOnly title="Unit code is the permanent identifier used by machines and users" /></label>
                <label>Location / Address<input value={editUnitCampus} onChange={event => setEditUnitCampus(event.target.value)} /></label>
                <label>Sewing Lines<input type="number" min="0" value={editUnitLines} onChange={event => setEditUnitLines(Number(event.target.value))} /></label>
                <label>Contact Person<input value={editUnitHead} onChange={event => setEditUnitHead(event.target.value)} /></label>
                <label>Machine Capacity<input type="number" min="0" value={editUnitMachines} onChange={event => setEditUnitMachines(Number(event.target.value))} /></label>
                <label>Mobile Number<input type="tel" value={editUnitPhone} onChange={event => setEditUnitPhone(event.target.value)} /></label>
                <label>Status<select value={editUnitStatus} onChange={event => setEditUnitStatus(event.target.value as FactoryUnitItem['status'])}><option value="ACTIVE">Active</option><option value="MAINTENANCE">Maintenance</option><option value="EXPANSION">Expansion</option><option value="INACTIVE">Inactive</option></select></label>
                <label className="settings-unit-edit-description">Description<textarea rows={2} value={editUnitDesc} onChange={event => setEditUnitDesc(event.target.value)} /></label>
              </div>
              <div className="settings-unit-edit-actions"><button type="submit" className="settings-primary">Update Unit</button><button type="button" onClick={() => setEditingUnit(null)}>Cancel</button></div>
            </form>
          </section>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: ADD NEW ZONE UNDER FACTORY UNIT (Multi-Zone Manager - Option 3)
      ────────────────────────────────────────────────────────────────────────── */}
      {zoneModalUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#059669]" />
                <span>Add Zone to {zoneModalUnit.code}</span>
              </h3>
              <button
                type="button"
                onClick={() => setZoneModalUnit(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Configure a new zone under <span className="font-bold text-slate-700">{zoneModalUnit.name}</span>. Its floor lines will automatically appear during machine registration and tracking.
            </p>

            <form onSubmit={handleSaveNewZone} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Zone Name *</label>
                <input
                  type="text"
                  required
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="e.g. SAMPLING BAY or PEACOCK 5"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#059669] outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Number of Sewing/Assembly Lines</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={newZoneLines}
                  onChange={(e) => setNewZoneLines(parseInt(e.target.value, 10) || 1)}
                  placeholder="e.g. 8"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#059669] outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Generates Line 01 through Line {String(newZoneLines).padStart(2, '0')} + Buffer Workshop automatically.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Notes (Optional)</label>
                <input
                  type="text"
                  value={newZoneDesc}
                  onChange={(e) => setNewZoneDesc(e.target.value)}
                  placeholder="e.g. Dedicated sampling & pre-production line"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setZoneModalUnit(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Zone</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: EDIT ZONE
      ────────────────────────────────────────────────────────────────────────── */}
      {editingZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#059669]" />
                <span>Edit Zone: {editingZone.zone.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingZone(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Update floor zone configuration for <span className="font-bold text-slate-700">{editingZone.unit.code}</span>.
            </p>

            <form onSubmit={handleSaveEditZone} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Zone Name *</label>
                <input
                  type="text"
                  required
                  value={editZoneName}
                  onChange={(e) => setEditZoneName(e.target.value)}
                  placeholder="e.g. SAMPLING BAY or PEACOCK"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#059669] outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Number of Sewing/Assembly Lines</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={editZoneLines}
                  onChange={(e) => setEditZoneLines(parseInt(e.target.value, 10) || 1)}
                  placeholder="e.g. 8"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#059669] outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Generates Line 01 through Line {String(editZoneLines).padStart(2, '0')} + Buffer Workshop automatically.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Notes (Optional)</label>
                <input
                  type="text"
                  value={editZoneDesc}
                  onChange={(e) => setEditZoneDesc(e.target.value)}
                  placeholder="e.g. Dedicated sampling & pre-production line"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingZone(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: ADD NEW USER
      ────────────────────────────────────────────────────────────────────────── */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#059669]" />
                <span>Provision New User Account</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="new-username" className="mb-1 block font-bold text-slate-700">Username</label>
                <input id="new-username" type="text" value={newUsername} onChange={event => setNewUsername(event.target.value)}
                  autoCapitalize="none" spellCheck={false} maxLength={40} placeholder="Generated automatically if blank"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-600" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. ramesh@textech.garments"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role / Department *</label>
                  <select
                    value={newRole}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#059669] outline-none"
                  >
                    {departments.length > 0 ? (
                      departments.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No departments created yet (add in Departments tab)
                      </option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Assigned Plant Unit {isMechanicRole(newRole, newDepartment, newTitle) ? <span className="text-[#059669] font-black">*</span> : null}
                  </label>
                  <select
                    value={newUnit}
                    onChange={(e) => {
                      const uVal = e.target.value;
                      setNewUnit(uVal);
                      if (uVal === 'All Units') { setNewZones([]); setIsNewZoneDropdownOpen(false); return; }
                      const avail = getAvailableZonesForUnit(uVal);
                      setNewZones((prev) => prev.filter((z) => avail.some((a) => (a.id || a.name) === z)));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#059669] outline-none"
                  >
                    <option value="All Units">
                      All Units
                    </option>
                    {factoryUnits.map((fu) => (
                      <option key={fu.id} value={fu.code}>
                        {fu.code} ({fu.campus || fu.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ─── DYNAMIC MULTI-SELECT ZONE CHECKLIST (FOR MECHANICS) ─── */}
              {isMechanicRole(newRole, newDepartment, newTitle) && newUnit !== 'All Units' && (
                <div
                  ref={newZoneDropdownRef}
                  className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#059669]" />
                      <span>Assigned Production Zones *</span>
                      <span className="text-[10px] text-emerald-700 font-normal">(Multi-select Checklist)</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {newZones.length} selected
                    </span>
                  </div>

                  {/* Dropdown Checklist Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      disabled={!newUnit || newUnit === 'All Units'}
                      onClick={() => setIsNewZoneDropdownOpen((prev) => !prev)}
                      className={`w-full px-3 py-2 text-left bg-white border rounded-xl flex items-center justify-between transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isNewZoneDropdownOpen
                          ? 'border-[#059669] ring-2 ring-[#059669]/20'
                          : 'border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                        {newZones.length === 0 ? (
                          <span className="text-slate-400">
                            {!newUnit || newUnit === 'All Units'
                              ? 'Select a plant unit first above...'
                              : 'Click dropdown to check zones...'}
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-800 truncate">
                            {newZones.join(', ')}
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                          isNewZoneDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Checklist Dropdown Popover */}
                    {isNewZoneDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 space-y-2">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-[11px]">
                          <span className="font-bold text-slate-600">Available Zones ({newUnit})</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const avail = getAvailableZonesForUnit(newUnit);
                                setNewZones(avail.map((z) => z.id || z.name));
                              }}
                              className="text-[#059669] hover:underline font-bold cursor-pointer"
                            >
                              Select All
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => setNewZones([])}
                              className="text-slate-500 hover:underline font-bold cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                          {getAvailableZonesForUnit(newUnit).length === 0 ? (
                            <p className="text-slate-400 text-center py-3 text-xs">
                              No zones configured for {newUnit}. Add zones in Plant Units tab.
                            </p>
                          ) : (
                            getAvailableZonesForUnit(newUnit).map((z) => {
                              const zKey = z.id || z.name;
                              const isChecked = newZones.includes(zKey);
                              return (
                                <div
                                  key={zKey}
                                  onClick={() => {
                                    setNewZones((prev) =>
                                      prev.includes(zKey)
                                        ? prev.filter((item) => item !== zKey)
                                        : [...prev, zKey]
                                    );
                                  }}
                                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none text-xs ${
                                    isChecked
                                      ? 'bg-emerald-50 text-emerald-900 font-semibold'
                                      : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}} // handled by parent div click
                                      className="w-4 h-4 text-[#059669] rounded border-slate-300 focus:ring-[#059669] cursor-pointer"
                                    />
                                    <span>{z.name}</span>
                                  </div>
                                  {z.linesCount ? (
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      {z.linesCount} lines
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">
                            {newZones.length} of {getAvailableZonesForUnit(newUnit).length} zones selected
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsNewZoneDropdownOpen(false)}
                            className="px-3 py-1 bg-[#059669] text-white rounded-lg font-bold hover:bg-[#047857] cursor-pointer shadow-2xs"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected Zone Pill Badges */}
                  {newZones.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {newZones.map((zk) => (
                        <span
                          key={zk}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-100/90 text-emerald-900 border border-emerald-300 shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          <span>{zk}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewZones((prev) => prev.filter((item) => item !== zk));
                            }}
                            className="text-emerald-700 hover:text-emerald-950 p-0.5 rounded-full hover:bg-emerald-200 transition cursor-pointer"
                            title="Remove zone"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {(!newUnit || newUnit === 'All Units') && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Please select a specific plant unit above to assign zones.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Temporary Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 9842X XXXXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewUser}
                  className="px-4 py-2 font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingNewUser ? 'Creating...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: EDIT USER
      ────────────────────────────────────────────────────────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#059669]" />
                <span>Edit User: {editingUser.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="edit-username" className="mb-1 block font-bold text-slate-700">Username</label>
                <input id="edit-username" type="text" value={editUsername} onChange={event => setEditUsername(event.target.value)}
                  autoCapitalize="none" spellCheck={false} maxLength={40} placeholder="Generated automatically if blank"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-600" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="edit-user-role" className="block font-bold text-slate-700 mb-1">Role</label>
                  <select id="edit-user-role" value={editRole} onChange={(event) => setEditRole(event.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-bold">
                    {[...new Set([editRole, 'ADMIN', 'ASSET_MANAGER', 'CEO', 'HEAD_MECHANIC_MANAGER', 'SERVICE_MECHANIC', 'SENIOR_MECHANIC', 'MECHANIC', 'SENIOR_ELECTRICIAN', 'ELECTRICIAN', 'STORE_PERSON'])].filter(Boolean).map((value) => (
                      <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-user-department" className="block font-bold text-slate-700 mb-1">Department</label>
                  <select id="edit-user-department" value={editDepartment} onChange={(event) => setEditDepartment(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-bold">
                    <option value="">No department assigned</option>
                    {[...new Set([editDepartment, ...departments.map((department) => department.name)])].filter(Boolean).map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Assigned Plant Unit {isMechanicRole(editRole, editDepartment, editTitle) ? <span className="text-[#059669] font-black">*</span> : null}
                  </label>
                  <select
                    value={editUnit}
                    onChange={(e) => {
                      const uVal = e.target.value;
                      setEditUnit(uVal);
                      if (uVal === 'All Units') { setEditZones([]); setIsEditZoneDropdownOpen(false); return; }
                      const avail = getAvailableZonesForUnit(uVal);
                      setEditZones((prev) => prev.filter((z) => avail.some((a) => (a.id || a.name) === z)));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#059669] outline-none"
                  >
                    <option value="All Units">
                      All Units
                    </option>
                    {factoryUnits.map((fu) => (
                      <option key={fu.id} value={fu.code}>
                        {fu.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#059669] outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* ─── DYNAMIC MULTI-SELECT ZONE CHECKLIST (FOR MECHANICS) ─── */}
              {isMechanicRole(editRole, editDepartment, editTitle) && editUnit !== 'All Units' && (
                <div
                  ref={editZoneDropdownRef}
                  className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#059669]" />
                      <span>Assigned Production Zones *</span>
                      <span className="text-[10px] text-emerald-700 font-normal">(Multi-select Checklist)</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {editZones.length} selected
                    </span>
                  </div>

                  {/* Dropdown Checklist Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      disabled={!editUnit || editUnit === 'All Units'}
                      onClick={() => setIsEditZoneDropdownOpen((prev) => !prev)}
                      className={`w-full px-3 py-2 text-left bg-white border rounded-xl flex items-center justify-between transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isEditZoneDropdownOpen
                          ? 'border-[#059669] ring-2 ring-[#059669]/20'
                          : 'border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                        {editZones.length === 0 ? (
                          <span className="text-slate-400">
                            {!editUnit || editUnit === 'All Units'
                              ? 'Select a plant unit first above...'
                              : 'Click dropdown to check zones...'}
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-800 truncate">
                            {editZones.join(', ')}
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                          isEditZoneDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Checklist Dropdown Popover */}
                    {isEditZoneDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 space-y-2">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-[11px]">
                          <span className="font-bold text-slate-600">Available Zones ({editUnit})</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const avail = getAvailableZonesForUnit(editUnit);
                                setEditZones(avail.map((z) => z.id || z.name));
                              }}
                              className="text-[#059669] hover:underline font-bold cursor-pointer"
                            >
                              Select All
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => setEditZones([])}
                              className="text-slate-500 hover:underline font-bold cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                          {getAvailableZonesForUnit(editUnit).length === 0 ? (
                            <p className="text-slate-400 text-center py-3 text-xs">
                              No zones configured for {editUnit}. Add zones in Plant Units tab.
                            </p>
                          ) : (
                            getAvailableZonesForUnit(editUnit).map((z) => {
                              const zKey = z.id || z.name;
                              const isChecked = editZones.includes(zKey);
                              return (
                                <div
                                  key={zKey}
                                  onClick={() => {
                                    setEditZones((prev) =>
                                      prev.includes(zKey)
                                        ? prev.filter((item) => item !== zKey)
                                        : [...prev, zKey]
                                    );
                                  }}
                                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none text-xs ${
                                    isChecked
                                      ? 'bg-emerald-50 text-emerald-900 font-semibold'
                                      : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}}
                                      className="w-4 h-4 text-[#059669] rounded border-slate-300 focus:ring-[#059669] cursor-pointer"
                                    />
                                    <span>{z.name}</span>
                                  </div>
                                  {z.linesCount ? (
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      {z.linesCount} lines
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">
                            {editZones.length} of {getAvailableZonesForUnit(editUnit).length} zones selected
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditZoneDropdownOpen(false)}
                            className="px-3 py-1 bg-[#059669] text-white rounded-lg font-bold hover:bg-[#047857] cursor-pointer shadow-2xs"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected Zone Pill Badges */}
                  {editZones.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {editZones.map((zk) => (
                        <span
                          key={zk}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-100/90 text-emerald-900 border border-emerald-300 shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          <span>{zk}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditZones((prev) => prev.filter((item) => item !== zk));
                            }}
                            className="text-emerald-700 hover:text-emerald-950 p-0.5 rounded-full hover:bg-emerald-200 transition cursor-pointer"
                            title="Remove zone"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {(!editUnit || editUnit === 'All Units') && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Please select a specific plant unit above to assign zones.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Password (leave blank to keep unchanged)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="px-4 py-2 font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: RESET PASSWORD
      ────────────────────────────────────────────────────────────────────────── */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
                <span>Reset Password</span>
              </h3>
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Reset access password for <span className="font-bold text-slate-800">{passwordModalUser.name}</span> ({passwordModalUser.email}).
            </p>

            <form onSubmit={handleConfirmResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={modalNewPassword}
                  onChange={(e) => setModalNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#059669] outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-4 py-2 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingPassword ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          FLOATING HELPDESK CHAT BUTTON
      ────────────────────────────────────────────────────────────────────────── */}
      <HelpDesk companySlug={currentUser?.companySlug} />
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<PageLoadingIndicator label="Loading settings…" />}>
      <SettingsContent />
    </Suspense>
  );
}
