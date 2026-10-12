'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Wrench,
  QrCode,
  Boxes,
  History,
  CalendarCheck,
  Layers,
  LogOut,
  Camera,
  Crown,
  Package,
  Users,
  UserPlus,
  Zap,
  LayoutDashboard,
  IndianRupee,
} from 'lucide-react';
import { LiveClock } from './LiveClock';
import { useAuth } from '@/context/AuthContext';
import {
  subscribeParts,
  subscribeRepairs,
  subscribeRequisitions,
} from '@/lib/services/cmmsService';
import { ScanModal } from '@/components/scan/ScanModal';
import { CameraScannerModal } from '@/components/scan/CameraScannerModal';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, logout } = useAuth();

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

  if (!user) return null;

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
    // 👑 CEO: Executive dashboard & approval desk
    navTabs = [
      {
        label: 'Executive Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        label: '👑 Critical Approvals (CEO)',
        href: '/dashboard/messages',
        icon: Crown,
        badge: pendingCeoCount > 0 ? pendingCeoCount : null,
        badgeColor: 'bg-rose-600 text-white animate-pulse',
        highlight: true,
      },
    ];
  } else if (role === 'STORE_PERSON') {
    // 📦 STORE PERSON: Store dashboard, monthly indents and tool crib inventory
    navTabs = [
      {
        label: 'Store Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        label: '📦 Monthly Store Indents',
        href: '/dashboard/store-inbox',
        icon: Package,
        badge: pendingStoreCount > 0 ? pendingStoreCount : null,
        badgeColor: 'bg-emerald-500 text-white',
        highlight: true,
      },
      {
        label: 'Tool Crib Inventory',
        href: '/dashboard/inventory',
        icon: Boxes,
        badge: lowStockCount > 0 ? lowStockCount : null,
        badgeColor: 'bg-rose-500 text-white',
      },
    ];
  } else if (role === 'SENIOR_MECHANIC' || role === 'SENIOR_ELECTRICIAN') {
    // 🔧 Senior Mechanic: Supervisor Dashboard, Calendar, Floor Tracker & Group Indent
    navTabs = [
      {
        label: 'Supervisor Dashboard',
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
        label: 'Group Indent',
        href: '/dashboard/inventory',
        icon: Package,
        badge: lowStockCount > 0 ? lowStockCount : null,
        badgeColor: 'bg-amber-500 text-slate-900',
      },
    ];
  } else if (role === 'MECHANIC' || role === 'ELECTRICIAN') {
    // 🦺 Mechanic: My Dashboard, Mechanic Calendar & Indent
    navTabs = [
      {
        label: 'My Dashboard',
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
        label: 'Indent',
        href: '/dashboard/inventory',
        icon: Boxes,
        badge: lowStockCount > 0 ? lowStockCount : null,
        badgeColor: 'bg-amber-500 text-slate-900',
      },
    ];
  } else {
    // 🛡️ Admin & Asset Manager: Admin Dashboard, Asset Registration, Assets, Allowance, History
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
        label: 'Assets',
        href: '/dashboard/asset-types',
        icon: Boxes,
      },
      {
        label: 'Allowance',
        href: '/dashboard/messages',
        icon: IndianRupee,
        badge: pendingCeoCount > 0 ? pendingCeoCount : null,
        badgeColor: 'bg-rose-600 text-white',
      },
      {
        label: 'History',
        href: '/dashboard/history',
        icon: History,
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
        return 'bg-blue-600 text-white';
      case 'SENIOR_MECHANIC':
        return 'bg-indigo-600 text-white';
      case 'SENIOR_ELECTRICIAN':
        return 'bg-cyan-600 text-white';
      case 'MECHANIC':
        return 'bg-amber-500 text-slate-950';
      case 'ELECTRICIAN':
        return 'bg-amber-400 text-slate-950 font-bold';
      case 'STORE_PERSON':
        return 'bg-emerald-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  return (
    <>
      <header className="bg-white text-slate-800 sticky top-0 z-30 shadow-xs border-b border-slate-200 no-print">
        {/* Top brand & system toolbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Name */}
            <Link
              href={role === 'CEO' ? '/dashboard/messages' : (role === 'MECHANIC' || role === 'SENIOR_MECHANIC' || role === 'ELECTRICIAN' || role === 'SENIOR_ELECTRICIAN') ? '/dashboard/calendar' : '/dashboard/machines'}
              className="flex items-center space-x-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs text-white font-bold text-lg group-hover:scale-105 transition">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">
                    Maintenance Module
                  </span>
                  <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                    v4.2
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Sewing Machine Maintenance &amp; Asset Ecosystem
                </p>
              </div>
            </Link>

            {/* Right side tools */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Live Floor Clock */}
              <LiveClock />

              {/* Admin Quick Action: Add User */}
              {(role === 'ADMIN' || role === 'ASSET_MANAGER') && (
                <Link
                  href="/dashboard/users"
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
                  title="Add New Factory User"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add User</span>
                </Link>
              )}

              {/* Floor QR Scanning Actions (Only visible for Plant Admin & Asset Manager) */}
              {(role === 'ADMIN' || role === 'ASSET_MANAGER') && (
                <>
                  {/* Camera Scanner Trigger */}
                  <button
                    onClick={() => setIsCameraModalOpen(true)}
                    className="hidden sm:flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
                    title="Scan QR Tag using Camera"
                  >
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden md:inline">Camera</span>
                  </button>

                  {/* Simulate QR Scan Floor Action */}
                  <button
                    onClick={() => setIsScanModalOpen(true)}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan Tag</span>
                  </button>
                </>
              )}

              {/* User Profile & Sign Out Button */}
              <div className="flex items-center space-x-2 bg-slate-50 py-1 pl-2.5 pr-1.5 rounded-xl border border-slate-200">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase shadow-2xs ${getRoleBadgeColor()}`}
                >
                  {role === 'CEO' ? (
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                  ) : role === 'STORE_PERSON' ? (
                    <Package className="w-3.5 h-3.5 text-white" />
                  ) : role === 'ELECTRICIAN' || role === 'SENIOR_ELECTRICIAN' ? (
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                  ) : (
                    user?.name?.charAt(0) || 'M'
                  )}
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-bold leading-tight text-slate-900">
                    {user?.name || 'Staff User'}
                  </div>
                  <div className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
                    {role}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="ml-1 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Sub-Navbar Tabs */}
        <nav className="bg-slate-50/90 border-t border-slate-200 overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 sm:space-x-2 py-1.5 whitespace-nowrap">
              {navTabs.map((tab) => {
                const isActive = pathname === tab.href;
                const Icon = tab.icon;

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : tab.highlight
                        ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    {tab.badge !== null && tab.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
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
        </nav>
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
