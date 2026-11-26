'use client';

import { useState } from 'react';
import { RefreshCw, Plus, Search, MapPin, Pencil, Trash2 } from 'lucide-react';
import type { FactoryUnitItem, FactoryUnitZoneItem } from '@/app/dashboard/settings/page';
import type { Machine, RepairTicket } from '@/types/cmms';
import { matchesUnit } from '@/lib/constants/units';

type Props = {
  units: FactoryUnitItem[]; machines: Machine[]; repairs: RepairTicket[];
  onAdd: () => void; onEdit: (unit: FactoryUnitItem) => void; onDelete: (unit: FactoryUnitItem) => void;
  getZones: (unit: FactoryUnitItem) => FactoryUnitZoneItem[];
  onAddZone: (unit: FactoryUnitItem) => void;
  onEditZone: (unit: FactoryUnitItem, zone: FactoryUnitZoneItem) => void;
  onDeleteZone: (unit: FactoryUnitItem, id: string) => void;
};

export function UnitSettingsPanel({ units, machines, repairs, onAdd, onEdit, onDelete, getZones, onAddZone, onEditZone, onDeleteZone }: Props) {
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [zoneSearch, setZoneSearch] = useState('');
  const [tab, setTab] = useState('Zone Overview');
  const [filter, setFilter] = useState('All zones');
  const unit = units.find(item => item.id === selected) || units[0];
  const belongs = (machine: Machine, target: FactoryUnitItem) => matchesUnit(machine.unit, target.code) || matchesUnit(machine.unit, target.id);
  const unitMachines = unit ? machines.filter(machine => belongs(machine, unit)) : [];
  const isOpen = (repair: RepairTicket) => !repair.resolvedAt && !repair.completedAt && !['RESOLVED', 'COMPLETED', 'CLOSED', 'CANCELLED'].includes(repair.status);
  const openRepairs = repairs.filter(isOpen);
  const unitRepairs = openRepairs.filter(repair => unitMachines.some(machine => machine.id === repair.machineId) || (unit && matchesUnit(repair.unit, unit.code)));
  const isBreakdown = (machine: Machine) => ['BREAKDOWN', 'UNDER_REPAIR', 'IN_REPAIR'].includes(machine.status);
  const zoneKey = (name: string) => {
    const clean = name.replace(/\s*\([^)]*\)\s*$/, '').trim().replace(/\s+/g, ' ').toUpperCase();
    return /^(?:NETHAJI|NETAJI)(?:\s*-.*)?$/.test(clean) ? 'NETHAJI' : clean;
  };
  const configuredZones = unit ? Array.from(getZones(unit).reduce((result, zone) => {
    const key = zoneKey(zone.name);
    const previous = result.get(key);
    if (!previous || zoneKey(zone.id) === zone.id.trim().toUpperCase()) result.set(key, { ...zone, name: key === 'NETHAJI' ? 'NETHAJI' : zone.name });
    return result;
  }, new Map<string, FactoryUnitZoneItem>()).values()) : [];
  const zoneNames = new Map(configuredZones.map(zone => [zoneKey(zone.name), zone.name.replace(/\s*\([^)]*\)\s*$/, '').trim()]));
  if (!unit?.zones) unitMachines.forEach(machine => { const name = machine.zone?.trim() || 'Unassigned'; if (!zoneNames.has(zoneKey(name))) zoneNames.set(zoneKey(name), name); });
  const zones = Array.from(zoneNames, ([key, name]) => {
    const configured = configuredZones.find(zone => zoneKey(zone.name) === key);
    const items = unitMachines.filter(machine => zoneKey(machine.zone || 'Unassigned') === key || (configured && zoneKey(machine.zone || 'Unassigned') === zoneKey(configured.id)));
    return { name, configured, total: items.length, active: items.filter(machine => machine.status === 'ACTIVE').length,
      breakdowns: items.filter(isBreakdown).length,
      lines: new Set(items.map(machine => machine.currentLine).filter(Boolean)).size || configured?.linesCount || 0,
      repairs: unitRepairs.filter(repair => items.some(machine => machine.id === repair.machineId)).length,
      downtime: items.reduce((sum, machine) => sum + (machine.totalDowntimeMinutes || 0), 0) };
  });
  const visible = zones.filter(zone => zone.name.toLowerCase().includes(zoneSearch.toLowerCase()) && (filter === 'All zones' || (filter === 'With breakdowns' ? zone.breakdowns > 0 : zone.total > 0 && zone.breakdowns === 0)));
  return <section className="settings-units">
    <header className="settings-units-title"><div><h2>Manufacturing Units</h2><p>Manage units and track maintenance in one place</p></div><div className="settings-unit-actions"><button onClick={() => window.location.reload()}><RefreshCw size={15} /> Refresh</button><button className="unit-primary" onClick={onAdd}><Plus size={15} /> Add Unit</button></div></header>
    <div className="settings-unit-layout"><aside className="settings-unit-panel"><div className="settings-unit-row"><h3>Manufacturing Units ({units.length})</h3><button className="unit-text-button" onClick={onAdd}>+ Add</button></div><label className="settings-unit-search"><Search size={16} /><input aria-label="Search units" placeholder="Search units by code, name..." value={search} onChange={event => setSearch(event.target.value)} /></label><div className="settings-unit-list">{units.filter(item => `${item.code} ${item.name}`.toLowerCase().includes(search.toLowerCase())).map(item => <button key={item.id} className={`settings-unit-option ${unit?.id === item.id ? 'selected' : ''}`} onClick={() => { setSelected(item.id); setZoneSearch(''); }}><div><b>{item.code}</b><strong>{item.name}</strong><span className="settings-unit-status">{item.status.replaceAll('_', ' ')}</span></div><small><MapPin size={13} />{item.campus || 'Location not set'} · {item.totalLines} Lines</small></button>)}{!units.length && <p>No units yet. Add your first unit to get started.</p>}</div></aside>
    {unit && <article className="settings-unit-panel settings-unit-content"><header className="settings-unit-row"><div><h3><em>{unit.code}</em> {unit.name} <span className="settings-unit-status">{unit.status}</span></h3><p><MapPin size={14} /> {unit.campus || 'Location not set'} · {unit.totalLines} Sewing Lines · {unit.headOfMaintenance || 'Lead unassigned'} {unit.contactPhone && `(${unit.contactPhone})`}</p></div><div className="settings-unit-actions"><button onClick={() => onEdit(unit)}><Pencil size={14} /> Edit Unit</button><button className="unit-danger" onClick={() => onDelete(unit)}><Trash2 size={14} /> Delete</button></div></header>
    <nav className="settings-unit-tabs" aria-label="Unit views">{['Zone Overview', 'Unit Details', 'Maintenance Summary'].map(name => <button key={name} onClick={() => setTab(name)} className={tab === name ? 'active' : ''}>{name}</button>)}</nav>
    {tab === 'Zone Overview' && <><div className="settings-unit-row settings-unit-toolbar"><label className="settings-unit-search"><Search size={16} /><input aria-label="Search unit zones" placeholder="Search zone name..." value={zoneSearch} onChange={event => setZoneSearch(event.target.value)} /></label><div className="settings-unit-filters">{['All zones', 'No breakdowns', 'With breakdowns'].map(name => <button key={name} className={filter === name ? 'selected' : ''} onClick={() => setFilter(name)}>{name} ({zones.filter(zone => name === 'All zones' || (name === 'With breakdowns' ? zone.breakdowns > 0 : zone.total > 0 && zone.breakdowns === 0)).length})</button>)}</div></div><div className="settings-unit-table"><table><thead><tr>{['Zone', 'Lines', 'Machines', 'Active', 'Breakdowns', 'Open Repairs', 'Availability', 'Downtime', 'Actions'].map(name => <th key={name}>{name}</th>)}</tr></thead><tbody>{visible.map(zone => <tr key={zone.name}><td><strong>{zone.name}</strong></td><td>{zone.lines}</td><td>{zone.total}</td><td>{zone.active}</td><td><span className={`settings-unit-status ${zone.breakdowns ? 'alert' : ''}`}>{zone.breakdowns}</span></td><td>{zone.repairs}</td><td>{zone.total ? Math.round(zone.active / zone.total * 100) + '%' : '?'}</td><td>{zone.downtime} min</td><td><div className="settings-unit-actions"><button disabled={!zone.configured} onClick={() => zone.configured && onEditZone(unit, zone.configured)}><Pencil size={14} /> Edit</button><button className="unit-danger" disabled={!zone.configured} title={zone.configured ? `Delete ${zone.name}` : "This zone is recorded on machines; manage its assignments first"} onClick={() => zone.configured && onDeleteZone(unit, zone.configured.id)}><Trash2 size={14} /> Delete</button></div></td></tr>)}</tbody></table>{!visible.length && <p className="settings-unit-empty">No zones match this view.</p>}</div></>}
    {tab === 'Unit Details' && <div className="settings-unit-details"><p>{unit.description || 'No description added.'}</p><div className="settings-unit-row"><h3>Zones & Lines</h3><button onClick={() => onAddZone(unit)}>+ Add Zone</button></div>{configuredZones.map(zone => <div className="settings-unit-zone" key={zone.id}><div><strong>{zone.name}</strong><small>{zone.linesCount || 0} lines {zone.description && `· ${zone.description}`}</small></div><div className="settings-unit-actions"><button onClick={() => onEditZone(unit, zone)}>Edit</button><button className="unit-danger" onClick={() => onDeleteZone(unit, zone.id)}>Delete</button></div></div>)}</div>}
    {tab === 'Maintenance Summary' && <div className="settings-unit-details"><h3>Line-wise maintenance summary</h3><div className="settings-unit-table"><table><thead><tr><th>Line</th><th>Total Assets</th><th>Active</th><th>Breakdowns</th><th>Open Repairs</th></tr></thead><tbody>{Array.from(new Set(unitMachines.map(machine => machine.currentLine))).sort().map(line => { const items = unitMachines.filter(machine => machine.currentLine === line); return <tr key={line}><td>{line || 'Unassigned'}</td><td>{items.length}</td><td>{items.filter(machine => machine.status === 'ACTIVE').length}</td><td>{items.filter(isBreakdown).length}</td><td>{unitRepairs.filter(repair => items.some(machine => machine.id === repair.machineId)).length}</td></tr>; })}</tbody></table>{!unitMachines.length && <p className="settings-unit-empty">No assets registered in this unit.</p>}</div></div>}
    </article>}</div>
  </section>;
}
