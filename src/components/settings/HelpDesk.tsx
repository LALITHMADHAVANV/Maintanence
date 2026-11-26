'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { MessageCircle, X, ArrowRight, Wrench, Calendar, Boxes } from 'lucide-react';

export function HelpDesk({ companySlug }: { companySlug?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const base = companySlug ? `/${encodeURIComponent(companySlug)}/dashboard` : '/dashboard';
  const shortcuts = [
    { title: 'Breakdowns & maintenance alerts', description: 'Review breakdown tickets and pending actions.', path: 'messages', icon: Wrench },
    { title: 'PPM schedules', description: 'Check upcoming services and overdue maintenance.', path: 'ppm-scheduler', icon: Calendar },
    { title: 'Stock & spare parts', description: 'Check stock availability and part requests.', path: 'inventory', icon: Boxes },
  ];
  return <div className="fixed bottom-6 right-6 z-40 no-print">
    <button type="button" aria-label="Open Help Desk" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()} className="w-12 h-12 rounded-full bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-lg flex items-center justify-center cursor-pointer" title="Open Help Desk"><MessageCircle size={24} /></button>
    <dialog ref={dialog} className="helpdesk-dialog" aria-labelledby="helpdesk-title">
      <header><div><h2 id="helpdesk-title">Maintenance Help Desk</h2><p>Find help and open the right maintenance workspace.</p></div><button type="button" aria-label="Close Help Desk" onClick={() => dialog.current?.close()}><X size={20} /></button></header>
      <div className="helpdesk-shortcuts">{shortcuts.map(({ title, description, path, icon: Icon }) => <Link key={path} href={`${base}/${path}`} onClick={() => dialog.current?.close()}><Icon size={20} /><span><strong>{title}</strong><small>{description}</small></span><ArrowRight size={17} /></Link>)}</div>
      <details><summary>How do I update units, zones, and lines?</summary><p>Open Settings → Units. Select a unit, then choose Edit Unit or use the zone row’s Edit button. Zone line counts can be updated in the zone editor.</p></details>
      <details><summary>How do I manage staff access?</summary><p>Open Settings → Users to add or edit staff and their assigned teams, units, zones, and lines. Team navigation permissions are managed under Teams / Departments.</p></details>
    </dialog>
  </div>;
}
