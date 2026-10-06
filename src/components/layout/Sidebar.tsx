'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Wrench,
  Boxes,
  History,
  CalendarCheck,
  Layers,
  LogOut,
  Crown,
  Package,
  UserPlus,
  Menu,
  X,
  ChevronRight,
  ClipboardList,
  Users,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  subscribeParts,
  subscribeRepairs,
  subscribeRequisitions,
} from '@/lib/services/cmmsService';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [pendingTicketsCount, setPendingTicketsCount] = useState<number>(0);
  const [pendingCeoCount, setPendingCeoCount] = useState<number>(0);
  const [pendingStoreCount, setPendingStoreCount] = useState<number>(0);

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

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
    badgeColor?: string;
    highlight?: boolean;
  }

  let navItems: NavItem[] = [];

  if (role === 'CEO') {
    navItems = [
      {
        label: 'CEO Approvals',
        href: '/dashboard/messages',
        icon: Crown,
        badge: pendingCeoCount > 0 ? pendingCeoCount : null,
        badgeColor: 'bg-rose-600 text-white animate-pulse',
        highlight: true,
      },
    ];
  } else if (role === 'STORE_PERSON') {
    navItems = [
      {
        label: 'Monthly Indents',
        href: '/dashboard/store-inbox',
        icon: Package,
        badge: pendingStoreCount > 0 ? pendingStoreCount : null,
        badgeColor: 'bg-emerald-500 text-white',
        highlight: true,
      },
      {
        label: 'Tool Crib & Parts',
        href: '/dashboard/inventory',
        icon: Boxes,
        badge: lowStockCount > 0 ? lowStockCount : null,
        badgeColor: 'bg-amber-500 text-slate-900',
      },
    ];
  } else if (role === 'ADMIN' || role === 'ASSET_MANAGER') {
    // Admin & Asset Manager: Streamlined without shopfloor tool crib & mechanic maintenance tickets
    navItems = [
      {
        label: 'Asset Registry & QR',
        href: '/dashboard/machines',
        icon: Wrench,
      },
      {
        label: 'Floor Workstations',
        href: '/dashboard/floor-tracker',
        icon: Layers,
      },
      {
        label: 'Asset Categories',
        href: '/dashboard/asset-types',
        icon: ClipboardList,
      },
      {
        label: 'Service History',
        href: '/dashboard/history',
        icon: History,
      },
      {
        label: 'CEO Approvals',
        href: '/dashboard/messages',
        icon: Crown,
        badge: pendingCeoCount > 0 ? pendingCeoCount : null,
        badgeColor: 'bg-rose-600 text-white',
      },
      {
        label: 'User Management',
        href: '/dashboard/users',
        icon: UserPlus,
      },
    ];
  } else {
    // Mechanic, Senior Mechanic, Electrician, Senior Electrician
    const isElectricianRole = role === 'ELECTRICIAN' || role === 'SENIOR_ELECTRICIAN';
    navItems = [
      {
        label: isElectricianRole ? 'Electrical & Tickets' : 'Maintenance & Tickets',
        href: '/dashboard/calendar',
        icon: CalendarCheck,
        badge: pendingTicketsCount > 0 ? pendingTicketsCount : null,
        badgeColor: 'bg-rose-500 text-white',
      },
      ...(!isElectricianRole
        ? [
            {
              label: 'Tool Crib & Indents',
              href: '/dashboard/inventory',
              icon: Boxes,
              badge: lowStockCount > 0 ? lowStockCount : null,
              badgeColor: 'bg-amber-500 text-slate-900',
            },
          ]
        : []),
      {
        label: 'Service History',
        href: '/dashboard/history',
        icon: History,
      },
      ...((role === 'SENIOR_MECHANIC' || role === 'SENIOR_ELECTRICIAN')
        ? [
            {
              label: role === 'SENIOR_ELECTRICIAN' ? 'Electrician Roster' : 'Team Work Roster',
              href: '/dashboard/mechanic-roster',
              icon: Users,
            },
          ]
        : []),
    ];
  }

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
        return 'bg-cyan-600 text-white font-bold';
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

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <Link
          href={role === 'CEO' ? '/dashboard/messages' : '/dashboard/machines'}
          className="flex items-center gap-3 group"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-105 transition shrink-0">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">
                TexTech
              </span>
              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30">
                CMMS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
              Asset Maintenance
            </p>
          </div>
        </Link>

        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
          Navigation
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : item.highlight
                  ? 'text-purple-300 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 transition ${
                    isActive
                      ? 'text-white'
                      : item.highlight
                      ? 'text-purple-400'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== null && item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold shrink-0 ${
                    item.badgeColor || 'bg-indigo-500 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout Bottom Dock */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold uppercase shrink-0 shadow-xs ${getRoleBadgeColor()}`}
            >
              {role === 'CEO' ? (
                <Crown className="w-4 h-4 text-amber-300" />
              ) : role === 'STORE_PERSON' ? (
                <Package className="w-4 h-4 text-white" />
              ) : (
                user?.name?.charAt(0) || 'M'
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate leading-tight">
                {user?.name || 'Staff User'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium uppercase truncate">
                {role}
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <>
      {/* Mobile Top App Bar (Only visible on small screens) */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white transition cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">
              <Wrench className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">TexTech CMMS</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRoleBadgeColor()}`}>
            {role}
          </span>
          <button
            onClick={handleSignOut}
            className="p-1.5 text-slate-400 hover:text-rose-400 transition cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Backdrop & Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Sticky Left Sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 sticky top-0 h-screen border-r border-slate-800 z-30">
        {sidebarContent}
      </aside>
    </>
  );
}
