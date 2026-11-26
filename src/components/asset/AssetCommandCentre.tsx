'use client';

import { useRef, useState } from 'react';
import { ArrowUpRight, Boxes, CheckCircle2, CircleAlert, Fingerprint, MapPin, Search, X, Pencil, History, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Machine } from '@/types/cmms';
import { assetScanUrl } from '@/lib/scanUrl';

export function AssetCommandCentre({ machines, companySlug, selectedUnit, onStatus, onEdit }: {
  machines: Machine[]; companySlug?: string; selectedUnit: string; onStatus: (status: string) => void; onEdit: (machine: Machine) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Machine | null>(null);
  const [query, setQuery] = useState('');
  const active = machines.filter(machine => machine.status === 'ACTIVE').length;
  const breakdowns = machines.filter(machine => machine.status === 'BREAKDOWN').length;
  const maintenance = machines.filter(machine => machine.status === 'UNDER_MAINTENANCE').length;
  const readiness = machines.length ? Math.round(active / machines.length * 100) : 0;
  const locations = [...new Set(machines.map(machine => machine.zone).filter(Boolean))];
  const found = query.trim() ? machines.filter(machine => `${machine.id} ${machine.name || ''} ${machine.brand} ${machine.model} ${machine.zone || ''} ${machine.currentLine}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : [];
  const open = (machine: Machine) => { setSelected(machine); dialog.current?.showModal(); };
  const scanLink = selected && companySlug ? assetScanUrl(typeof window !== 'undefined' ? window.location.origin : '', selected.id, companySlug) : '';
  return <>
    <section className="asset-command" aria-label="Asset command centre">
      <div className="asset-command-main"><div className="asset-command-eyebrow"><span /> ASSET COMMAND CENTRE <span className="asset-command-scope">{selectedUnit}</span></div><h1>Every asset.<br /><em>One clear picture.</em></h1><p>Your fleet, its readiness, and the machines that need attention.</p>
        <div className="asset-passport-search"><Search size={17} /><input aria-label="Find an asset passport" placeholder="Find an asset passport by ID, brand or location…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Clear asset search" onClick={() => setQuery('')}><X size={15} /></button>}
          {query.trim() && <div className="asset-passport-results">{found.length ? found.map(machine => <button key={machine.id} onClick={() => open(machine)}><Fingerprint size={20} /><span><strong>{machine.id}</strong><small>{machine.name || `${machine.brand} ${machine.typeName || machine.type}`} · {machine.currentLine}</small></span><ArrowUpRight size={16} /></button>) : <p>No matching assets in this unit.</p>}</div>}
        </div>
        <div className="asset-command-foot"><Fingerprint size={14} /> Digital passports <span>·</span> Location traceability <span>·</span> QR enabled</div>
      </div>
      <div className="asset-command-readiness"><div className="asset-readiness-ring" style={{ background: `conic-gradient(#55e3b4 ${readiness}%, #ffffff16 0)` }}><div><strong>{machines.length ? readiness + '%' : '—'}</strong><span>FLEET READINESS</span></div></div><p><span /> {active.toLocaleString()} of {machines.length.toLocaleString()} assets active</p><small>Active assets ÷ total registered assets</small></div>
      <div className="asset-command-stats">{[
        { title: 'Fleet inventory', value: machines.length, hint: `${locations.length} zones connected`, status: 'ALL', icon: Boxes, tone: '' },
        { title: 'Running in production', value: active, hint: 'View active assets', status: 'ACTIVE', icon: CheckCircle2, tone: 'ready' },
        { title: 'Breakdown attention', value: breakdowns, hint: 'Review affected machines', status: 'BREAKDOWN', icon: CircleAlert, tone: 'attention' },
        { title: 'Under maintenance', value: maintenance, hint: 'View servicing assets', status: 'UNDER_MAINTENANCE', icon: History, tone: 'service' },
      ].map(({ title, value, hint, status, icon: Icon, tone }) => <button className={`asset-command-stat ${tone}`} key={title} onClick={() => onStatus(status)}><span><Icon size={16} />{title}<ArrowUpRight size={15} /></span><strong>{value.toLocaleString()}</strong><small>{hint}</small></button>)}</div>
    </section>
    <dialog ref={dialog} className="asset-passport-dialog" aria-labelledby="asset-passport-title">
      {selected && <><header><div><span className="asset-passport-kicker"><Fingerprint size={15} /> DIGITAL ASSET PASSPORT</span><h2 id="asset-passport-title">{selected.id}</h2><p>{selected.name || `${selected.brand} ${selected.typeName || selected.type}`}</p></div><button aria-label="Close asset passport" onClick={() => dialog.current?.close()}><X size={21} /></button></header>
        <div className="asset-passport-body"><div className="asset-passport-identity"><span className={`asset-passport-state ${selected.status === 'BREAKDOWN' ? 'danger' : ''}`}>{selected.status.replaceAll('_', ' ')}</span><h3>{selected.brand} <span>{selected.model}</span></h3><p><MapPin size={15} />{[selected.unit, selected.zone, selected.currentLine, selected.stationNo].filter(Boolean).join(' · ')}</p><div className="asset-passport-facts"><div><small>Machine type</small><strong>{selected.typeName || selected.type}</strong></div><div><small>Purchase date</small><strong>{selected.purchaseDate ? new Date(selected.purchaseDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not recorded'}</strong></div><div><small>Recorded downtime</small><strong>{selected.totalDowntimeMinutes || 0} min</strong></div><div><small>Operator</small><strong>{selected.operator || 'Not assigned'}</strong></div></div></div>{scanLink && <a href={scanLink} className="asset-passport-qr"><QRCodeSVG value={scanLink} size={120} /><span>Scan for machine access <ArrowUpRight size={12} /></span></a>}</div>
        <section className="asset-passport-movements"><h3><History size={16} /> Movement trail</h3>{selected.relocationHistory?.length ? [...selected.relocationHistory].reverse().slice(0, 5).map((movement, index) => <article key={`${movement.movedAt}-${index}`}><span className="asset-movement-dot" /><div><strong>{movement.fromLine} <ArrowRight size={12} /> {movement.toLine}</strong><p>{movement.reason || 'Location updated'}{movement.movedBy ? ` · ${movement.movedBy}` : ''}</p><small>{new Date(movement.movedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</small></div></article>) : <p>No recorded movements for this asset.</p>}</section>
        <footer><button onClick={() => { dialog.current?.close(); onEdit(selected); }}><Pencil size={15} /> Edit asset details</button><button onClick={() => dialog.current?.close()}>Close passport</button></footer>
      </>}
    </dialog>
  </>;
}
