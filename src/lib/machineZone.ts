/** Sahana Unit 2 operates in the PEACOCK zone. Other tenants retain their own zones. */
export function resolveMachineZone(machine: { unit?: string; zone?: string; company?: string; companySlug?: string }, tenant?: string): string | undefined {
  const company = (tenant || machine.companySlug || machine.company || '').trim().toLowerCase();
  const unit = (machine.unit || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (company === 'sahana' && unit === 'unit2') return 'PEACOCK';
  return machine.zone;
}

/** Keep old numbered staff assignments as lines when the Unit 2 zone becomes PEACOCK. */
export function normalizeStaffLocation<T extends { unit?: string; zone?: string; zones?: string[]; lines?: string[]; company?: string; companySlug?: string }>(profile: T, tenant?: string): T & { zones?: string[]; lines?: string[] } {
  const company = (tenant || profile.companySlug || profile.company || '').trim().toLowerCase();
  if (company !== 'sahana' || (profile.unit || '').toLowerCase().replace(/[^a-z0-9]/g, '') !== 'unit2') return profile;
  const zones = profile.zones || (profile.zone ? [profile.zone] : []);
  const lines = [...new Set([...(profile.lines || []), ...zones.flatMap(zone => {
    const number = /^zone\s*0?([1-8])$/i.exec(zone.trim());
    return number ? [`Line 0${number[1]}`] : [];
  })])];
  return { ...profile, zones: zones.length ? ['PEACOCK'] : [], ...(profile.zone ? { zone: 'PEACOCK' } : {}), ...(lines.length ? { lines } : {}) };
}

/** Accept old Unit 2 Zone 1–8 labels as line numbers before normalizing the zone. */
export function normalizeMachineLocation<T extends { unit?: string; zone?: string; currentLine?: string; area?: string; location?: string; company?: string; companySlug?: string }>(machine: T, tenant?: string): T {
  const zone = resolveMachineZone(machine, tenant);
  const peacockUnit = zone === 'PEACOCK' && (tenant || machine.companySlug || machine.company || '').trim().toLowerCase() === 'sahana'
    && (machine.unit || '').toLowerCase().replace(/[^a-z0-9]/g, '') === 'unit2';
  const keepWorkshop = /workshop|service|scrap|buffer/i.test(machine.currentLine || '');
  const number = peacockUnit && !keepWorkshop ? /^zone\s*0?([1-8])$/i.exec(machine.zone?.trim() || '') || /^zone\s*0?([1-8])$/i.exec(machine.currentLine?.trim() || '') : null;
  const label = (value?: string) => !peacockUnit || !value ? value : /^NETHAJI$/i.test(value.trim()) ? 'PEACOCK'
    : value.replace(/(?:PEACOCK\s*[-•]?\s*)?Zone\s*0?([1-8])\b/gi, (_, line: string) => `PEACOCK - Line 0${line}`);
  return { ...machine, ...(zone !== undefined ? { zone } : {}), ...(number ? { currentLine: `Line 0${number[1]}` } : {}),
    ...(machine.area !== undefined ? { area: label(machine.area) } : {}), ...(machine.location !== undefined ? { location: label(machine.location) } : {}) };
}
