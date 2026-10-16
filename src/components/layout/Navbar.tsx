'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Wrench,
  QrCode,
  Boxes,
  History,
  CalendarCheck,
  LogOut,
  Camera,
  Crown,
  Package,
  UserPlus,
  Zap,
  LayoutDashboard,
  IndianRupee,
  Settings,
  PanelLeft,
  PanelLeftClose,
  Menu,
  Users,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react';
import { LiveClock } from './LiveClock';
import { useAuth } from '@/context/AuthContext';
import { useNav } from '@/context/NavContext';
import {
  subscribeParts,
  subscribeRepairs,
  subscribeRequisitions,
} from '@/lib/services/cmmsService';
import { ScanModal } from '@/components/scan/ScanModal';
import { CameraScannerModal } from '@/components/scan/CameraScannerModal';

export function Navbar() {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();
  const { isNavHidden, toggleNav, openMobileNav } = useNav();

  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [pendingTicketsCount, setPendingTicketsCount] = useState<number>(0);
  const [pendingCeoCount, setPendingCeoCount] = useState<number>(0);
  const [pendingStoreCount, setPendingStoreCount] = useState<number>(0);

  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);

  const handleSignOut = async () => {
    await logout();
    window.location.href = '/';
  };

  useEffect(() => {
    const unsubParts = subscribeParts((parts) => {
      const low = parts.filter((p) => p.stock <= p.minStock).length;
      setLowStockCount(low);
    });

    const unsubRepairs = subscribeRepairs((repairs) => {
      const pending = repairs.filter((r) => r.status !== 'COMPLETED').length;
      setPendingTicketsCount(pending);
    });

    const unsubReqs = subscribeRequisitions((reqs) => {
      const ceoPending = reqs.filter(
        (r) =>
          (r.type === 'CRITICAL_CEO' || r.requiresCeoApproval) &&
          r.status === 'PENDING_CEO_APPROVAL'
      ).length;
      setPendingCeoCount(ceoPending);

      const storePending = reqs.filter(
        (r) => r.type === 'MONTHLY_INDENT' && r.status !== 'FULFILLED'
      ).length;
      setPendingStoreCount(storePending);
    });

    return () => {
      unsubParts();
      unsubRepairs();
      unsubReqs();
    };
  }, []);

  if (!user) return null;

  interface NavTab {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
    badgeColor?: string;
    highlight?: boolean;
  }

  let navTabs: NavTab[] = [];

  if (role === 'CEO') {
    navTabs = [
      {
        label: 'Executive Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        label: '👑 Critical Approvals',
        href: '/dashboard/messages',
        icon: Crown,
        badge: pendingCeoCount > 0 ? pendingCeoCount : null,
        badgeColor: 'bg-rose-600 text-white animate-pulse',
        highlight: true,
      },
    ];
  } else if (role === 'STORE_PERSON') {
    navTabs = [
      {
        label: 'Store Desk',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        label: '📦 Monthly Indents',
        href: '/dashboard/store-inbox',
        icon: Package,
        badge: pendingStoreCount > 0 ? pendingStoreCount : null,
        badgeColor: 'bg-emerald-500 text-white',
        highlight: true,
      },
      {
        label: 'Tool Crib & Stock',
        href: '/dashboard/inventory',
        icon: Boxes,
        badge: lowStockCount > 0 ? lowStockCount : null,
        badgeColor: 'bg-rose-500 text-white',
      },
      {
        label: 'Dispatch History',
        href: '/dashboard/history',
        icon: History,
      },
    ];
  } else if (role === 'SENIOR_MECHANIC') {
    navTabs = [
      {
        label: 'Supervisor Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        label: 'Asset Log',
        href: '/dashboard/asset-log',
        icon: ClipboardList,
      },
      {
        label: 'Mechanic Calendar',
        href: '/dashboard/calendar',
        icon: CalendarCheck,
        badge: pendingTicketsCount > 0 ? pendingTicketsCount : null,
        badgeColor: 'bg-amber-400 text-slate-950 font-extrabold',
      },
      {
        label: 'Mechanic Roster',
        href: '/dashboard/mechanic-roster',
        icon: Users,
      },
      {
        label: 'Group Indent',
        href: '/dashboard/inventory',
        icon: Package,
        badge: lowStockCount > 0 ? lowStockCount : null,
        badgeColor: 'bg-rose-500 text-white',
      },
      {
        label: 'History Ledger',
        href: '/dashboard/history',
        icon: History,
      },
    ];
  } else if (role === 'SENIOR_ELECTRICIAN') {
    navTabs = [
      {
        label: 'Supervisor Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        label: 'Asset Log',
        href: '/dashboard/asset-log',
        icon: ClipboardList,
      },
      {
        label: 'Electrical Calendar',
        href: '/dashboard/calendar',
        icon: CalendarCheck,
        badge: pendingTicketsCount > 0 ? pendingTicketsCount : null,
        badgeColor: 'bg-cyan-400 text-slate-950 font-extrabold',
      },
      {
        label: 'Electrician Roster',
        href: '/dashboard/mechanic-roster',
        icon: Users,
      },
      {
        label: 'Electrical Indent',
        href: '/dashboard/inventory',
        icon: Zap,
        badge: lowStockCount > 0 ? lowStockCount : null,
        badgeColor: 'bg-rose-500 text-white',
      },
      {
        label: 'History Ledger',
        href: '/dashboard/history',
        icon: History,
      },
    ];
  } else if (role === 'MECHANIC') {
    navTabs = [
      {
        label: 'My Workbench',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        label: 'Mechanic Calendar',
        href: '/dashboard/calendar',
        icon: CalendarCheck,
        badge: pendingTicketsCount > 0 ? pendingTicketsCount : null,
        badgeColor: 'bg-amber-400 text-slate-950 font-extrabold',
      },
      {
        label: 'Spares & Indent',
        href: '/dashboard/inventory',
        icon: Boxes,
        badge: lowStockCount > 0 ? lowStockCount : null,
        badgeColor: 'bg-rose-500 text-white',
      },
      {
        label: 'My Work History',
        href: '/dashboard/history',
        icon: History,
      },
    ];
  } else if (role === 'ELECTRICIAN') {
    navTabs = [
      {
        label: 'My Workbench',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        label: 'Electrical Calendar',
        href: '/dashboard/calendar',
        icon: CalendarCheck,
        badge: pendingTicketsCount > 0 ? pendingTicketsCount : null,
        badgeColor: 'bg-amber-400 text-slate-950 font-extrabold',
      },
      {
        label: 'Electrical Indent',
        href: '/dashboard/inventory',
        icon: Zap,
        badge: lowStockCount > 0 ? lowStockCount : null,
        badgeColor: 'bg-rose-500 text-white',
      },
      {
        label: 'My Work History',
        href: '/dashboard/history',
        icon: History,
      },
    ];
  } else {
    // ADMIN / ASSET_MANAGER
    navTabs = [
      {
        label: 'Admin Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        label: 'Asset Registration',
        href: '/dashboard/machines',
        icon: QrCode,
      },
      {
        label: 'Asset Master',
        href: '/dashboard/asset-types',
        icon: Boxes,
      },
      {
        label: 'Allowance Desk',
        href: '/dashboard/allowance',
        icon: IndianRupee,
      },
      {
        label: 'Audit History',
        href: '/dashboard/history',
        icon: History,
      },
      {
        label: 'Factory Users',
        href: '/dashboard/users',
        icon: UserPlus,
      },
      {
        label: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
      },
    ];
  }

  // Get color for role badge
  const getRoleBadgeColor = () => {
    switch (role) {
      case 'CEO':
        return 'bg-purple-600 text-white';
      case 'ADMIN':
      case 'ASSET_MANAGER':
        return 'bg-indigo-600 text-white';
      case 'SENIOR_MECHANIC':
        return 'bg-blue-600 text-white';
      case 'SENIOR_ELECTRICIAN':
        return 'bg-cyan-600 text-white';
      case 'MECHANIC':
        return 'bg-amber-500 text-slate-950 font-bold';
      case 'ELECTRICIAN':
        return 'bg-amber-400 text-slate-950 font-bold';
      case 'STORE_PERSON':
        return 'bg-emerald-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  const getWorkspaceTitle = () => {
    switch (role) {
      case 'CEO':
        return 'CEO Executive Suite';
      case 'ADMIN':
      case 'ASSET_MANAGER':
        return 'Plant Operations & Asset Hub';
      case 'SENIOR_MECHANIC':
        return 'Supervisor Sewing Desk';
      case 'SENIOR_ELECTRICIAN':
        return 'Supervisor Electrical Desk';
      case 'MECHANIC':
        return 'Mechanic Service Workbench';
      case 'ELECTRICIAN':
        return 'Electrical Service Workbench';
      case 'STORE_PERSON':
        return 'Store & Tool Crib Central';
      default:
        return 'Maintenance Module';
    }
  };

  const isTabActive = (tabHref: string) => {
    if (tabHref === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(tabHref);
  };

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md text-slate-800 sticky top-0 z-30 shadow-xs border-b border-slate-200/90 no-print">
        {/* Tier 1: System Bar & Quick Tools */}
        <div className="w-full px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* Left: Mobile Drawer Trigger / Desktop Sidebar Toggle & Breadcrumb */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Mobile Drawer Button */}
              <button
                onClick={openMobileNav}
                className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Desktop Sidebar Collapse / Expand Toggle */}
              <button
                onClick={toggleNav}
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer active:scale-95 shadow-2xs ${
                  isNavHidden
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title={isNavHidden ? 'Show Left Sidebar' : 'Hide Left Sidebar for Full-Width Mode'}
              >
                {isNavHidden ? (
                  <>
                    <PanelLeft className="w-4 h-4 text-indigo-600" />
                    <span>Show Sidebar</span>
                  </>
                ) : (
                  <>
                    <PanelLeftClose className="w-4 h-4 text-slate-500" />
                    <span>Collapse</span>
                  </>
                )}
              </button>

              {/* Workspace Title & Active Indicator */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate">
                      {getWorkspaceTitle()}
                    </h1>
                    <span
                      className={`hidden sm:inline-flex px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeColor()}`}
                    >
                      {role}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Quick Tools, Live Clock, Scanner & Profile */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* Live Factory Floor Clock */}
              <LiveClock />

              {/* QR Tag Scan Action */}
              <button
                onClick={() => setIsScanModalOpen(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                title="Quick Scan Machine QR Tag"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Scan Tag</span>
              </button>

              {/* Camera Scanner Trigger (Admins & Supervisors) */}
              {(role === 'ADMIN' ||
                role === 'ASSET_MANAGER' ||
                role === 'SENIOR_MECHANIC' ||
                role === 'SENIOR_ELECTRICIAN') && (
                <button
                  onClick={() => setIsCameraModalOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer"
                  title="Live Camera QR Scanner"
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden lg:inline">Camera</span>
                </button>
              )}

              {/* User Profile Pill & Sign Out */}
              <div className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-50 py-1 pl-2 sm:pl-2.5 pr-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold uppercase shadow-2xs shrink-0 ${getRoleBadgeColor()}`}
                >
                  {role === 'CEO' ? (
                    <Crown className="w-3.5 h-3.5 text-amber-300" />
                  ) : role === 'STORE_PERSON' ? (
                    <Package className="w-3.5 h-3.5 text-white" />
                  ) : role === 'ELECTRICIAN' || role === 'SENIOR_ELECTRICIAN' ? (
                    <Zap className="w-3.5 h-3.5 text-amber-200" />
                  ) : (
                    user?.name?.charAt(0) || 'M'
                  )}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold leading-tight text-slate-900 truncate max-w-[120px]">
                    {user?.name || 'Staff User'}
                  </div>
                  <div className="text-[9px] font-bold tracking-wider uppercase text-slate-400">
                    {role}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tier 2: Persistent Quick Nav Bar (Horizontal Tabs for All Logins) */}
        <div className="bg-slate-50/80 border-t border-slate-200/70 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="w-full px-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1.5 sm:gap-2 py-1.5 whitespace-nowrap">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-2 hidden sm:inline-block">
                Quick Nav:
              </span>
              {navTabs.map((tab) => {
                const active = isTabActive(tab.href);
                const Icon = tab.icon;

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 select-none active:scale-95 ${
                      active
                        ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                        : tab.highlight
                        ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                    {tab.badge !== null && tab.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ml-0.5 ${
                          tab.badgeColor || 'bg-indigo-500 text-white'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Floor Scanner Simulator Modal */}
      <ScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onOpenLiveScanner={() => {
          setIsScanModalOpen(false);
          setIsCameraModalOpen(true);
        }}
      />

      {/* Live Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
      />
    </>
  );
}

export const QuickNavBar = Navbar;
