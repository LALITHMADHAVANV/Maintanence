"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Bell, Building2, CalendarDays, CheckCheck, RefreshCw, Search, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNav } from '@/context/NavContext';
import { canAccessRoute, normalizeRole } from '@/lib/constants/roles';
import { departmentMenuGroups } from '@/lib/departmentNavigation';
import { getFactoryUnitsFromSettings, hasAllUnitsAccess, isUserAdmin, matchesUnit, normalizeUnit } from '@/lib/constants/units';
import { acknowledgeAppNotification, subscribeMachines, subscribeNotifications, subscribeParts, subscribePPMSchedules, subscribeRepairs, subscribeRequisitions } from '@/lib/services/cmmsService';
import type { AppNotification, Machine, PartRequisition, PPMSchedule, RepairTicket, SparePart } from '@/types/cmms';
import { tenantPreferences } from '@/lib/tenantPreferences';
import { maintenanceReminders } from '@/lib/maintenanceReminders';

function HeaderClock() {
  const [time, setTime] = useState('--:--:--');
  useEffect(() => {
    const tick = () => setTime(new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    }).format(new Date()));
    const timer = setInterval(tick, 1000);
    queueMicrotask(tick);
    return () => clearInterval(timer);
  }, []);
  return <time className="ml-1 border-l border-slate-200 pl-2 text-xs tabular-nums" aria-label="Current time in India" title="Current time (IST)">{time} IST</time>;
}

function NotificationBell({ machines }: { machines: Machine[] }) {
  const { user } = useAuth();
  const { selectedUnit } = useNav();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [ppm, setPpm] = useState<PPMSchedule[]>([]);
  const [parts, setParts] = useState<SparePart[]>([]);
  const [requisitions, setRequisitions] = useState<PartRequisition[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [read, setRead] = useState<string[]>([]);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const storageKey = `notification_reads_${user?.uid || ''}`;
  useEffect(() => {
    const unsubscribe = subscribeNotifications(data => {
      setNotifications(data);
      try { const stored = JSON.parse(tenantPreferences.getItem(storageKey) || '[]'); setRead(Array.isArray(stored) ? stored : []); } catch { setRead([]); }
    });
    const unsubscribeRepairs = subscribeRepairs(setRepairs);
    const unsubscribePpm = subscribePPMSchedules(setPpm);
    const unsubscribeParts = subscribeParts(setParts);
    const unsubscribeRequisitions = subscribeRequisitions(setRequisitions);
    const timer = setInterval(() => setNow(Date.now()), 60000);
    const openNotifications = () => setOpen(true);
    window.addEventListener('workspace-open-notifications', openNotifications);
    return () => { unsubscribe(); unsubscribeRepairs(); unsubscribePpm(); unsubscribeParts(); unsubscribeRequisitions(); clearInterval(timer); window.removeEventListener('workspace-open-notifications', openNotifications); };
  }, [storageKey, user?.companySlug]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [open]);
  const currentRole = normalizeRole(user?.role);
  const scopedMachines = machines.filter(machine => matchesUnit(machine.unit, selectedUnit));
  const machineIds = new Set(scopedMachines.map(machine => machine.id));
  const scopeRepair = repairs.filter(ticket => matchesUnit(ticket.unit, selectedUnit) || machineIds.has(ticket.machineId));
  const reminders = isUserAdmin(currentRole) ? maintenanceReminders(scopedMachines, scopeRepair,
    ppm.filter(task => matchesUnit(task.unit, selectedUnit) || machineIds.has(task.machineId)), parts, requisitions, now) : [];
  const items = [
    ...notifications.filter(item => (!item.targetUserId || item.targetUserId === user?.uid)
      && (!item.targetRole || item.targetRole === 'ALL' || normalizeRole(item.targetRole) === currentRole || isUserAdmin(currentRole))
      && (!item.targetUnit || matchesUnit(item.targetUnit, selectedUnit)))
      .map(item => ({ id: item.id, title: item.title, message: item.message, timestamp: item.createdAt, priority: item.type === 'CRITICAL_BREAKDOWN' ? 'High' : 'Info', read: Boolean(item.acknowledged) || read.includes(item.id), appId: item.id, path: '/dashboard/messages' })),
    ...reminders.map(item => ({ ...item, read: read.includes(item.id), appId: undefined })),
    ...repairs.filter(item => !isUserAdmin(currentRole) && !['COMPLETED', 'REJECTED'].includes(item.status) && matchesUnit(item.unit, selectedUnit)
      && (isUserAdmin(currentRole) || item.attendedBy === user?.name || item.reportedBy === user?.name))
      .map(item => ({ id: `repair:${item.id}:${item.status}`, title: `${item.urgency === 'CRITICAL' ? 'Critical breakdown' : 'Active breakdown'}: ${item.machineId}`, message: `${item.id} · ${item.line}: ${item.faultCategory}. ${item.faultDetails} Assigned to ${item.attendedBy || 'Unassigned'}.`, timestamp: item.reportedAt, priority: item.urgency === 'CRITICAL' ? 'High' : 'Normal', read: read.includes(`repair:${item.id}:${item.status}`), appId: undefined, path: '/dashboard/messages' })),
  ].sort((a, b) => (new Date(b.timestamp).getTime() || 0) - (new Date(a.timestamp).getTime() || 0));
  const unread = items.filter(item => !item.read).length;
  function markRead(ids: string[]) {
    const next = [...new Set([...read, ...ids])].slice(-2000);
    setRead(next);
    try { tenantPreferences.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep read state for this session if storage is full. */ }
    items.filter(item => ids.includes(item.id) && item.appId).forEach(item => acknowledgeAppNotification(item.appId!));
  }
  return <div ref={container} className="workspace-notifications">
    <button ref={trigger} type="button" aria-label={`Notifications, ${unread} unread`} aria-expanded={open} aria-controls="workspace-notification-panel" className="workspace-icon-button" onClick={() => setOpen(value => !value)}><Bell size={17} />{unread > 0 && <span className="workspace-notification-count">{unread > 99 ? '99+' : unread}</span>}</button>
    {open && <section id="workspace-notification-panel" aria-label="Notifications" className="workspace-notification-panel">
      <div className="workspace-notification-heading"><strong>Notifications</strong><span>{unread} unread</span><button type="button" disabled={!unread} onClick={() => markRead(items.map(item => item.id))}><CheckCheck size={14} />Mark all as read</button><button type="button" aria-label="Close notifications" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={15} /></button></div>
      <div className="workspace-notification-list">{items.map(item => <Link key={item.id} href={`/${user?.companySlug || 'sahana'}${item.path}`} className={`workspace-notification-item ${item.read ? '' : 'is-unread'}`} onClick={() => { markRead([item.id]); setOpen(false); }}><span className="workspace-notification-symbol"><Bell size={15} /></span><div><strong>{item.title}</strong><p>{item.message}</p><time>{Number.isFinite(new Date(item.timestamp).getTime()) ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.timestamp)) : 'Action pending'}</time></div><span className="workspace-notification-priority">{item.priority}</span></Link>)}{!items.length && <p className="workspace-notification-empty">No notifications for this unit.</p>}</div>
      <Link href={`/${user?.companySlug || 'sahana'}/dashboard/messages`} className="workspace-notification-footer" onClick={() => setOpen(false)}>View all in Notifications →</Link>
    </section>}
  </div>;
}

const titles: Record<string, string> = {
  'assign-task': 'Assign a task', 'active-tna': 'T&A',
  allowance: 'Allowances', users: 'User access', 'store-inbox': 'Store requests',
  dashboard: 'Plant overview', 'asset-types': 'Equipment fleet', 'lease-assets': 'Lease assets', machines: 'Equipment',
  calendar: 'Team overview', inventory: 'Spare parts',
  'ppm-scheduler': 'Preventive maintenance', 'mechanic-roster': 'Maintenance team',
  history: 'T&A', 'asset-log': 'Asset log', messages: 'Notifications',
  settings: 'Settings', kpi: 'Performance', 'floor-tracker': 'Factory floor',
};

export function WorkspaceHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { departmentNavigation, selectedUnit, setSelectedUnit, ticketDate, setTicketDate } = useNav();
  const [search, setSearch] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [configuredUnits, setConfiguredUnits] = useState<string[]>([]);
  useEffect(() => subscribeMachines(data => {
    setMachines(data);
    setConfiguredUnits(getFactoryUnitsFromSettings().map(unit => unit.code));
  }), [user?.companySlug]);
  const canSwitchUnits = isUserAdmin(user?.role) || hasAllUnitsAccess(user?.unit);
  const unitOptions = [...new Map([...configuredUnits, ...machines.map(machine => machine.unit), selectedUnit]
    .filter((unit): unit is string => Boolean(unit) && !hasAllUnitsAccess(unit))
    .map(unit => [normalizeUnit(unit), unit])).values()];
  const companySlug = user?.companySlug || 'sahana';
  const companyName = user?.company || (companySlug === 'texplus' ? 'Texplus' : 'Sahana');

  const section = pathname.split('/').filter(Boolean).pop() || 'dashboard';
  const title = titles[section] || section.replace(/-/g, ' ');
  const results = search.trim() ? departmentMenuGroups.flatMap(group => group.items)
    .filter(([path, label]) => label.toLowerCase().includes(search.toLowerCase()) && canAccessRoute(user?.role, path) && (departmentNavigation === null || departmentNavigation.includes(path))) : [];

  return (
    <header className="workspace-topbar workspace-default-header no-print" aria-label={`${companyName} workspace header`}>
      <div className="workspace-header-search">
        <Search size={17} aria-hidden="true" />
        <input aria-label="Search workspace pages" placeholder="Search pages, reports, equipment…" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setSearch(''); }} />
        {search.trim() && <div className="workspace-search-results">
          {results.map(([path, label]) => <Link key={path} href={`/${companySlug}${path}`} onClick={() => setSearch('')}>{label}</Link>)}
          {!results.length && <p>No matching pages</p>}
        </div>}
      </div>
      <div className="workspace-header-filters">
        <label className="workspace-header-date workspace-header-unit"><Building2 size={17} aria-hidden="true" /><span className="sr-only">Switch unit</span>
          <select aria-label="Switch unit" value={selectedUnit} disabled={!canSwitchUnits} onChange={event => setSelectedUnit(event.target.value)}>
            {canSwitchUnits && <option value="All Units">All Units ({machines.length})</option>}
            {unitOptions.filter(unit => canSwitchUnits || matchesUnit(unit, selectedUnit)).map(unit => <option key={normalizeUnit(unit)} value={unit}>{unit} ({machines.filter(machine => matchesUnit(machine.unit, unit)).length})</option>)}
          </select>
        </label>
        <div className="workspace-header-date" title="Filter tickets by reported date (IST)"><CalendarDays size={17} aria-hidden="true" />
          <input aria-label="Ticket date (IST)" type="date" value={ticketDate} onChange={event => setTicketDate(event.target.value)} />
          <HeaderClock />
        </div>
      </div>
      <div className="workspace-topbar-actions">
        {(departmentNavigation === null || departmentNavigation.includes('/dashboard/messages')) && (
          <NotificationBell machines={machines} />
        )}
        <button type="button" className="workspace-header-refresh" onClick={() => window.location.reload()}><RefreshCw size={16} /><span>Refresh</span></button>
        <div className="workspace-avatar" title={user?.name || 'My account'}>
          {user?.name?.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'M'}
        </div>
        <div className="workspace-header-profile"><strong>{user?.name || 'My account'}</strong><span>{user?.department || user?.role?.replaceAll('_', ' ') || title}</span></div>
        <button type="button" className="workspace-header-signout" onClick={async () => { await logout(); router.replace(`/${companySlug}/login`); }}>Sign out</button>
      </div>
    </header>
  );
}
