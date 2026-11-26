'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Bell, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Eye, RefreshCw, ShieldAlert, Volume2, VolumeX, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNav } from '@/context/NavContext';
import { filterMaintenanceReminders, maintenanceReminders } from '@/lib/maintenanceReminders';
import { durationMinutes, formatDuration, reportDay } from '@/lib/dailyTicketReport';
import { resolveMachineZone } from '@/lib/machineZone';
import type { Machine, PartRequisition, PPMSchedule, RepairTicket, SparePart } from '@/types/cmms';

export function MaintenanceReminderCenter({ machines, repairs, ppmSchedules, parts, requisitions, onRefresh, isLoading }: {
  machines: Machine[]; repairs: RepairTicket[]; ppmSchedules: PPMSchedule[]; parts: SparePart[]; requisitions: PartRequisition[]; onRefresh: () => void; isLoading: boolean;
}) {
  const { user } = useAuth();
  const { selectedUnit } = useNav();
  const [open, setOpen] = useState(true);
  const [category, setCategory] = useState('Breakdowns');
  const [selectedZone, setSelectedZone] = useState('All zones');
  const [selectedLine, setSelectedLine] = useState('All lines');
  const zoneScroller = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const [messageIndex, setMessageIndex] = useState(0);
  const [selectedReminderId, setSelectedReminderId] = useState('');
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [autoCloseAt, setAutoCloseAt] = useState(() => Date.now() + 300000);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const alertAudio = useRef<AudioContext | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const reminders = useMemo(() => maintenanceReminders(machines, repairs, ppmSchedules, parts, requisitions, now), [machines, repairs, ppmSchedules, parts, requisitions, now]);
  const categories = ['Breakdowns', 'Overdue PPM', 'Overdue repairs', 'Stock maintenance', 'Other reminders', 'All reminders'];
  const categoryRows = filterMaintenanceReminders(reminders, category, 'All zones');
  const unit2Selected = selectedUnit.toLowerCase().replace(/[^a-z0-9]/g, '') === 'unit2';
  const lineMode = (unit2Selected || selectedZone === 'PEACOCK') && category !== 'Stock maintenance';
  const zones = [...new Set(categoryRows.map(item => item.zone))].sort();
  const activeZone = lineMode ? 'PEACOCK' : selectedZone === 'All zones' || zones.includes(selectedZone) ? selectedZone : 'All zones';
  const zoneRows = filterMaintenanceReminders(reminders, category, activeZone);
  const numberedLines = Array.from({ length: 8 }, (_, index) => `Line 0${index + 1}`);
  const lines = [...numberedLines, ...[...new Set(zoneRows.map(item => item.line).filter((line): line is string => Boolean(line)))].filter(line => !numberedLines.includes(line)).sort()];
  const activeLine = lines.includes(selectedLine) ? selectedLine : 'All lines';
  const locationOptions = lineMode ? ['All lines', ...lines] : ['All zones', ...zones];
  const activeLocation = lineMode ? activeLine : activeZone;
  const visible = filterMaintenanceReminders(reminders, category, activeZone, lineMode ? activeLine : 'All lines');
  const timestamp = (value?: string) => value && Number.isFinite(new Date(value).getTime()) ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', ...(value.includes('T') ? { timeStyle: 'short' as const } : {}) }).format(new Date(value)) : '—';
  const activeMessage = reminders[messageIndex % (reminders.length || 1)];
  const pending = reminders.length > 0;
  const statusClass = pending ? 'is-pending' : isLoading ? 'is-checking' : 'is-clear';
  const selectedIndex = Math.max(0, visible.findIndex(item => item.id === selectedReminderId));
  const selectedReminder = visible[selectedIndex];
  const machineZones = new Map(machines.map(machine => {
    const zone = resolveMachineZone(machine, user?.companySlug)?.trim() || 'Unspecified zone';
    const number = /^zone\s*0?([1-8])$/i.exec(zone);
    return [machine.id, number ? `Zone ${number[1]}` : zone];
  }));
  const breakdownPpm = ppmSchedules.filter(task => selectedReminder?.machineId
    ? task.machineId === selectedReminder.machineId
    : (activeZone === 'All zones' || machineZones.get(task.machineId) === activeZone)
      && (!lineMode || activeLine === 'All lines' || machines.find(machine => machine.id === task.machineId)?.currentLine === activeLine))
    .sort((a, b) => (new Date(a.nextDue).getTime() || 0) - (new Date(b.nextDue).getTime() || 0));
  function ppmTiming(task: PPMSchedule) {
    const scheduledDay = /^\d{4}-\d{2}-\d{2}$/.test(task.nextDue || '') ? task.nextDue : reportDay(task.nextDue);
    const actualDay = task.status === 'COMPLETED' ? task.completedAt ? reportDay(task.completedAt) : '' : reportDay(now);
    const days = scheduledDay && actualDay ? Math.round((Date.parse(`${actualDay}T00:00:00Z`) - Date.parse(`${scheduledDay}T00:00:00Z`)) / 86400000) : null;
    const overdue = task.status !== 'COMPLETED' && (task.status === 'OVERDUE' || (days !== null && days > 0));
    const label = task.status === 'COMPLETED' ? days === null ? 'Completed' : days > 0 ? `+${days}d late` : 'On time'
      : overdue ? days !== null && days > 0 ? `+${days}d overdue` : 'Overdue'
      : days === null ? 'Date unavailable' : days === 0 ? 'Due today' : `In ${Math.abs(days)}d`;
    return { overdue, label, status: overdue ? 'OVERDUE' : task.status };
  }
  const countdown = (until: number) => {
    const seconds = Math.min(300, Math.max(0, Math.ceil((until - now) / 1000)));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };
  function openAlert() {
    setAutoCloseAt(Date.now() + 300000);
    setSnoozedUntil(null);
    setOpen(true);
  }
  function snoozeAlert() {
    setSnoozedUntil(Date.now() + 300000);
    setOpen(false);
  }
  function nextReminder(direction = 1) {
    if (visible.length) setSelectedReminderId(visible[(selectedIndex + direction + visible.length) % visible.length].id);
  }
  function changeZone(direction: number) {
    const next = locationOptions[(locationOptions.indexOf(activeLocation) + direction + locationOptions.length) % locationOptions.length];
    if (lineMode) setSelectedLine(next); else setSelectedZone(next);
  }
  function playAlert() {
    const context = alertAudio.current;
    if (!context || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    oscillator.frequency.setValueAtTime(880, context.currentTime + 0.15);
    gain.gain.setValueAtTime(0.05, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
  }
  async function toggleSound() {
    if (soundEnabled) { setSoundEnabled(false); return; }
    try {
      alertAudio.current ??= new AudioContext();
      await alertAudio.current.resume();
      setSoundEnabled(true);
      playAlert();
    } catch { setSoundEnabled(false); }
  }
  useEffect(() => {
    if (open && pending && soundEnabled) playAlert();
  }, [open, pending, soundEnabled]);
  useEffect(() => () => { void alertAudio.current?.close(); }, []);
  useEffect(() => {
    const timer = setInterval(() => { setNow(Date.now()); setMessageIndex(index => index + 1); }, 10000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (open && time >= autoCloseAt) {
        setOpen(false);
        setSnoozedUntil(time + 300000);
      } else if (!open && snoozedUntil !== null && time >= snoozedUntil) {
        setAutoCloseAt(time + 300000);
        setSnoozedUntil(null);
        setOpen(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [pending, open, autoCloseAt, snoozedUntil]);
  useEffect(() => {
    const modal = dialog.current;
    if (open && modal && !modal.open) modal.showModal();
    if (!open && modal?.open) modal.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; if (modal?.open) modal.close(); };
  }, [open]);
  useEffect(() => {
    if (open && content.current) content.current.scrollTop = 0;
  }, [open, category, activeZone, activeLine, selectedReminder?.id]);
  useEffect(() => {
    zoneScroller.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [activeLocation]);
  return <>
    <div className={`maintenance-reminder-bar ${statusClass}`}>
      <button type="button" className="maintenance-reminder-open" onClick={openAlert} aria-haspopup="dialog">
        <span className="maintenance-reminder-bell">{pending ? <AlertTriangle size={23} /> : <CheckCircle2 size={23} />}</span>
        <span className="maintenance-reminder-preview"><strong>{pending ? 'Maintenance warning — action required' : isLoading ? 'Checking maintenance status' : 'All clear — maintenance is up to date'} {pending && <span>{reminders.length} pending</span>}</strong><span>{activeMessage ? `${activeMessage.title} — ${activeMessage.message}` : isLoading ? 'Refreshing breakdowns, scheduled work and stock reminders…' : 'No breakdowns, overdue work, stock alerts or pending maintenance reminders for this unit.'}</span></span>
        {pending && <span className="maintenance-reminder-next-alert">{snoozedUntil ? `Next alert in ${countdown(snoozedUntil)}` : 'Active 5-Min Warning'}</span>}
        <span className="maintenance-reminder-view"><Eye size={17} />{pending ? 'Open Full Screen Alert' : 'View maintenance status'}</span>
      </button>
      <button type="button" className="maintenance-reminder-refresh" aria-label="Refresh maintenance reminders" disabled={isLoading} onClick={onRefresh}><RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /></button>
    </div>
    <dialog ref={dialog} className={`maintenance-reminder-dialog ${statusClass}`} aria-labelledby="maintenance-reminder-title" onCancel={snoozeAlert} onClick={event => { if (event.target === event.currentTarget) snoozeAlert(); }} onPointerDown={() => { if (pending) setAutoCloseAt(Date.now() + 300000); }} onKeyDown={() => { if (pending) setAutoCloseAt(Date.now() + 300000); }}>
      <div className="maintenance-reminder-dialog-inner">
        <div className="maintenance-reminder-dialog-heading">
          <span className="maintenance-reminder-bell">{pending ? <ShieldAlert size={29} /> : <CheckCircle2 size={29} />}</span>
          <div className="maintenance-alert-heading-copy"><div className="maintenance-alert-meta"><span className="maintenance-reminder-alert-label">{pending ? 'FULL SCREEN WARNING ALERT' : isLoading ? 'CHECKING MAINTENANCE' : 'MAINTENANCE STATUS — ALL CLEAR'}</span>{pending && <><span>Recurring every 5 mins for Admin</span><span className="maintenance-alert-countdown"><Clock size={12} />Auto-closing in {countdown(autoCloseAt)}</span></>}</div><h2 id="maintenance-reminder-title">{pending ? `${category === 'All reminders' ? 'Machine breakdowns & maintenance actions' : category} — ${selectedUnit}` : isLoading ? 'Updating your maintenance briefing' : 'Everything is up to date'}</h2></div>
          <div className="maintenance-alert-heading-actions"><button type="button" aria-label={soundEnabled ? 'Mute alert sound' : 'Enable alert sound'} title={soundEnabled ? 'Mute alert sound' : 'Enable alert sound'} aria-pressed={soundEnabled} onClick={() => void toggleSound()}>{soundEnabled ? <Volume2 size={21} /> : <VolumeX size={21} />}</button><button type="button" autoFocus aria-label="Close maintenance reminders" onClick={snoozeAlert}><X size={22} /></button></div>
        </div>
        <div className="maintenance-zone-filter maintenance-reference-strip">
          <label className="maintenance-category-picker"><span>Categories ({reminders.length})</span><select aria-label="Maintenance category" value={category} onChange={event => setCategory(event.target.value)}>{categories.map(name => <option key={name} value={name}>{name} ({name === 'All reminders' ? reminders.length : reminders.filter(item => item.category === name).length})</option>)}</select></label>
          {!unit2Selected && lineMode && <button type="button" aria-label="Back to all zones" title="Back to all zones" onClick={() => setSelectedZone('All zones')}><ChevronLeft size={16} /></button>}
          <div ref={zoneScroller} className="maintenance-zone-options" aria-label={lineMode ? 'Filter PEACOCK by line' : 'Filter by zone'}>
            {locationOptions.map(location => <button type="button" key={location} aria-pressed={activeLocation === location} onClick={() => { if (lineMode) setSelectedLine(location); else setSelectedZone(location); }}>{location}<span>{lineMode ? location === 'All lines' ? zoneRows.length : zoneRows.filter(item => item.line === location).length : location === 'All zones' ? categoryRows.length : categoryRows.filter(item => item.zone === location).length}</span></button>)}
          </div>
          <span className="maintenance-zone-result">{lineMode ? `PEACOCK · ${activeLine}` : activeZone}<small>{visible.length} {category === 'Breakdowns' ? 'machines' : 'reminders'}</small></span>
          <button type="button" aria-label={lineMode ? 'Previous line' : 'Previous zone'} onClick={() => changeZone(-1)}><ChevronLeft size={16} /></button>
          <button type="button" aria-label={lineMode ? 'Next line' : 'Next zone'} onClick={() => changeZone(1)}><ChevronRight size={16} /></button>
        </div>
        <div ref={content} className="maintenance-reminder-items maintenance-reminder-table-content">
          <div className="maintenance-reminder-table-heading"><div><h3>{category === 'Breakdowns' ? 'Breakdown machines' : category}</h3><p>{selectedUnit} · {activeZone}{lineMode ? ` · ${activeLine}` : ''} · All dates · Times in IST</p></div><span>{visible.length} requiring attention</span></div>
          <p className="maintenance-reminder-explanation">{lineMode ? 'Unit 2 machines belong to PEACOCK. Select Line 01–08 to review their maintenance reminders.' : 'Choose a zone above. Select PEACOCK to filter Unit 2 by Line 01–08.'} Stock is shared across the plant.</p>
          {isLoading && <p role="status" className="maintenance-reminder-empty">Updating reminders…</p>}
          <div className="maintenance-reminder-table-scroll"><table className="maintenance-reminder-table"><thead><tr>{['#', 'Machine / item', 'Zone / location', 'Fault / task / details', 'Technician / owner', 'Reported / created', 'Due / open duration', 'Status', 'Action'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>
            {visible.map((item, index) => <tr key={item.id} className={item.id === selectedReminder?.id ? 'is-selected' : ''}>
              <td>{index + 1}</td>
              <td><button type="button" className="maintenance-select-row" aria-pressed={item.id === selectedReminder?.id} onClick={() => setSelectedReminderId(item.id)}>{item.machineId || item.reference}</button>{item.assetName && <span>{item.assetName}</span>}{item.machineId && item.reference !== item.machineId && <small>{item.reference}</small>}</td>
              <td><strong>{item.zone}</strong><span>{[item.unit, item.line].filter(Boolean).join(' · ') || '—'}</span></td>
              <td className="maintenance-reminder-details"><small>{item.category}</small><p>{item.message}</p></td>
              <td>{item.owner || '—'}</td>
              <td>{item.id.startsWith('ppm:') ? '—' : timestamp(item.timestamp)}</td>
              <td>{item.dueAt ? timestamp(item.dueAt) : ['Breakdowns', 'Overdue repairs'].includes(item.category) ? formatDuration(durationMinutes(item.timestamp, new Date(now).toISOString())) : '—'}</td>
              <td><span className={`maintenance-table-status ${item.priority === 'High' ? 'is-high' : ''}`}>{item.status.replaceAll('_', ' ')}</span></td>
              <td><Link className="maintenance-table-review" href={`/${user?.companySlug || 'sahana'}${item.path}`} onClick={() => setOpen(false)}>Review <ChevronRight size={13} /></Link></td>
            </tr>)}
            {!isLoading && !visible.length && <tr><td colSpan={9}><div className="maintenance-reminder-empty"><Bell size={28} /><strong>No pending reminders</strong><p>Nothing pending for this category and zone.</p></div></td></tr>}
          </tbody></table></div>
          {category === 'Breakdowns' && <section className="maintenance-ppm-schedule" aria-labelledby="breakdown-ppm-title">
            <div className="maintenance-reminder-table-heading"><div><h3 id="breakdown-ppm-title"><CalendarDays size={18} />PPM Schedule</h3><p>{selectedReminder?.machineId ? `Preventive maintenance for machine ${selectedReminder.machineId}.` : `Preventive maintenance for ${activeZone.toLowerCase()}.`} Scheduled dates and completion progress.</p></div><span>{breakdownPpm.length} scheduled tasks</span></div>
            <div className="maintenance-reminder-table-scroll"><table className="maintenance-reminder-table maintenance-ppm-table"><thead><tr>{['#', 'Task / machine', 'Frequency', 'Last serviced', 'Scheduled due', 'Technician', 'Due / delay', 'Status'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>
              {breakdownPpm.map((task, index) => { const timing = ppmTiming(task); return <tr key={task.id} className={timing.overdue ? 'is-ppm-overdue' : ''}>
                <td>{index + 1}</td><td><strong>{task.task}</strong><span>{task.machineId} · {task.id}</span></td><td>{task.frequency || `${task.intervalDays} days`}</td><td>{timestamp(task.lastServiced)}</td><td className={timing.overdue ? 'ppm-overdue-date' : ''}>{timestamp(task.nextDue)}</td><td>{task.assignedTo || 'Unassigned'}</td>
                <td><div><span className={`maintenance-ppm-delay ${timing.overdue || timing.label.includes('late') ? 'is-late' : ''}`}>{timing.label}</span></div></td><td><div><span className={`maintenance-ppm-status ${task.status === 'COMPLETED' ? 'is-completed' : timing.overdue ? 'is-overdue' : 'is-pending'}`}>{timing.status.replaceAll('_', ' ')}</span></div></td>
              </tr>; })}
              {!breakdownPpm.length && <tr><td colSpan={8}><div className="maintenance-reminder-empty"><CalendarDays size={25} /><strong>No PPM schedule recorded</strong><p>{selectedReminder?.machineId ? 'This breakdown machine has no scheduled preventive maintenance tasks.' : 'No scheduled preventive maintenance tasks match this zone.'}</p></div></td></tr>}
            </tbody></table></div>
            <Link className="maintenance-ppm-open" href={`/${user?.companySlug || 'sahana'}/dashboard/ppm-scheduler`} onClick={() => setOpen(false)}>Open PPM Scheduler <ChevronRight size={14} /></Link>
          </section>}
        </div>
        <div className="maintenance-reminder-dialog-footer"><span className="maintenance-alert-footer-note"><Clock size={16} />{pending ? <>Alert repeats every <strong>5 minutes</strong> until resolved. <em>Auto-closing in {countdown(autoCloseAt)} if untouched.</em></> : 'Everything is up to date for this unit.'}</span><div className="maintenance-alert-footer-actions">{visible.length > 0 && <><button type="button" className="maintenance-alert-next" onClick={() => nextReminder()}>Next {category === 'Breakdowns' ? 'machine' : 'reminder'} ({selectedIndex + 1} of {visible.length}) →</button><button type="button" className="maintenance-alert-snooze" onClick={snoozeAlert}><Clock size={15} />Acknowledge & Snooze for 5 Mins</button>{selectedReminder && <Link href={`/${user?.companySlug || 'sahana'}${selectedReminder.path}`} onClick={() => setOpen(false)}>Go to {selectedReminder.machineId || selectedReminder.reference} <ChevronRight size={15} /></Link>}</>}{!visible.length && <button type="button" onClick={snoozeAlert}>Continue to dashboard</button>}</div></div>
      </div>
    </dialog>
  </>;
}
