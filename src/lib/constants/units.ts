/**
 * Factory Units configuration and matching helpers for Sahana Garments CMMS
 */

export interface FactoryUnitOption {
  id: string; // Stored value in MongoDB user / machine record
  name: string; // Friendly display name
  description: string;
  badgeColor: string;
}

export const FACTORY_UNITS: FactoryUnitOption[] = [
  {
    id: 'All Units',
    name: 'All Units',
    description: 'All Units access',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    id: 'UNIT - 1',
    name: 'UNIT - 1',
    description: 'UNIT - 1 operations',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  {
    id: 'UNIT-2',
    name: 'UNIT-2',
    description: 'UNIT-2 operations',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
];

/**
 * Normalizes unit string for fuzzy matching (strips non-alphanumerics, case-insensitive)
 * E.g., 'UNIT - 1', 'Unit 1', 'unit-1' all normalize to 'unit1'
 */
export function normalizeUnit(val?: string | null): string {
  if (!val) return '';
  return val.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if a machine / asset or record belongs to the user's unit.
 * If user has 'All Units', undefined, empty, or 'ALL', it matches everything.
 */
export function matchesUnit(itemUnit?: string | null, targetUnit?: string | null): boolean {
  if (!targetUnit || targetUnit === 'All Units' || targetUnit === 'ALL' || targetUnit === 'Plant-wide') {
    return true;
  }
  if (!itemUnit) {
    // If item has no unit specified, don't filter out unless strict
    return false;
  }
  return normalizeUnit(itemUnit) === normalizeUnit(targetUnit);
}

/**
 * Gets the unit display badge info
 */
export function getUnitBadgeInfo(unit?: string | null): { label: string; color: string } {
  const norm = normalizeUnit(unit);
  if (!norm || norm === 'allunits' || norm === 'all' || norm === 'plantwide') {
    return {
      label: 'All Units',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    };
  }
  if (norm === 'unit1') {
    return {
      label: 'UNIT - 1',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    };
  }
  if (norm === 'unit2') {
    return {
      label: 'UNIT-2',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }
  if (norm === 'unit3') {
    return {
      label: 'Unit 03',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }
  return {
    label: unit || 'Plant-wide',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

/**
 * Checks if the role is an administrative authority with multi-unit privileges
 */
export function isUserAdmin(role?: string | null): boolean {
  if (!role) return false;
  const upper = role.toUpperCase();
  return upper === 'ADMIN' || upper === 'CEO';
}

/**
 * Returns the effective scoped unit for a user.
 * - For Admin / CEO: returns whatever unit is selected, or null/'All Units' if viewing plant-wide.
 * - For all mechanics and non-admin personnel: ALWAYS strictly returns their assigned unit
 *   (defaulting to 'UNIT - 1' if not set), ensuring they only ever see data for what unit they handle.
 */
export function getUserScopedUnit(
  user?: { unit?: string | null } | null,
  role?: string | null,
  selectedAdminUnit?: string | null
): string {
  if (isUserAdmin(role)) {
    return selectedAdminUnit || user?.unit || 'All Units';
  }
  // All mechanics, electricians, store persons, etc. are strictly locked to their assigned unit
  if (user?.unit && user.unit !== 'All Units' && user.unit !== 'ALL') {
    return user.unit;
  }
  return 'UNIT - 1';
}

/**
 * Validates whether a specific unit is allowed for the user.
 * Non-admins can only ever access their assigned unit.
 */
export function isUnitAllowedForUser(
  unitToCheck: string | null | undefined,
  user?: { unit?: string | null } | null,
  role?: string | null
): boolean {
  if (isUserAdmin(role)) return true;
  const userUnit = getUserScopedUnit(user, role);
  return matchesUnit(unitToCheck, userUnit);
}
