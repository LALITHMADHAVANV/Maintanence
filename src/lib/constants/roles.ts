import { UserRole } from '@/types/cmms';

/**
 * Normalizes any role string (e.g. from DB, custom department name, or input casing)
 * into a standardized UserRole constant.
 */
export function normalizeRole(role?: string | null): UserRole {
  if (!role) return 'MECHANIC';
  const clean = role.trim().toUpperCase().replace(/[\s-]+/g, '_');

  if ((clean.includes('HEAD') || clean.includes('MANAGER')) && clean.includes('MECH')) return 'HEAD_MECHANIC_MANAGER';
  if (clean.includes('SERVICE') && clean.includes('MECH')) return 'SERVICE_MECHANIC';
  if (clean === 'ASSET_MANAGER') return 'ASSET_MANAGER';

  if (clean.includes('CEO') || clean.includes('EXECUTIVE') || clean.includes('DIRECTOR')) {
    return 'CEO';
  }
  if (clean.includes('ADMIN') || clean.includes('MANAGER')) {
    return 'ADMIN';
  }
  if (clean.includes('STORE') || clean.includes('CRIB') || clean.includes('INVENTORY')) {
    return 'STORE_PERSON';
  }
  if (clean.includes('SENIOR') && (clean.includes('ELEC') || clean.includes('POWER'))) {
    return 'SENIOR_ELECTRICIAN';
  }
  if (clean.includes('SENIOR') || (clean.includes('CHIEF') && clean.includes('MECH'))) {
    return 'SENIOR_MECHANIC';
  }
  if (clean.includes('ELEC')) {
    return 'ELECTRICIAN';
  }
  if (clean.includes('MECH') || clean.includes('TECH')) {
    return 'MECHANIC';
  }

  return clean as UserRole;
}

/**
 * Checks whether a given role is allowed to view a specific route path.
 */
export function canAccessRoute(rawRole: string | null | undefined, pathname: string): boolean {
  const role = normalizeRole(rawRole);
  // Strip any company prefix (e.g. /sahana/dashboard/inventory -> /dashboard/inventory)
  const cleanPath = pathname.replace(/^\/[^/]+(?=\/dashboard)/, '');

  if (role === 'HEAD_MECHANIC_MANAGER') {
    return cleanPath === '/dashboard' || (cleanPath.startsWith('/dashboard/') && !/^\/dashboard\/settings(?:\/|$)/.test(cleanPath));
  }

  // Admin & Asset Manager have full unrestricted access to all pages
  if (role === 'ADMIN' || role === 'ASSET_MANAGER') {
    return true;
  }

  // Root dashboard and notifications are accessible to all authenticated credentials
  if (cleanPath === '/dashboard' || cleanPath === '/dashboard/messages') {
    return true;
  }

  // 1. CEO / Executive permissions
  if (role === 'CEO') {
    const ceoAllowed = [
      '/dashboard',
      '/dashboard/messages',
      '/dashboard/asset-types',
      '/dashboard/asset-log',
      '/dashboard/history',
      '/dashboard/kpi',
      '/dashboard/floor-tracker',
    ];
    return ceoAllowed.some((r) => cleanPath === r || cleanPath.startsWith(`${r}/`));
  }

  // 2. STORE_PERSON permissions
  if (role === 'STORE_PERSON') {
    const storeAllowed = [
      '/dashboard/store-inbox',
      '/dashboard/inventory',
      '/dashboard/asset-types',
      '/dashboard/asset-log',
      '/dashboard/history',
      '/dashboard/messages',
    ];
    return storeAllowed.some((r) => cleanPath === r || cleanPath.startsWith(`${r}/`));
  }

  // 3. MECHANIC & ELECTRICIAN permissions (Floor Technicians)
  if (role === 'MECHANIC' || role === 'SERVICE_MECHANIC' || role === 'ELECTRICIAN') {
    const mechanicAllowed = [
      '/dashboard/calendar',
      '/dashboard/inventory',
      '/dashboard/history',
      '/dashboard/messages',
      '/dashboard/asset-log',
      '/dashboard/asset-types',
      '/dashboard/floor-tracker',
    ];
    return mechanicAllowed.some((r) => cleanPath === r || cleanPath.startsWith(`${r}/`));
  }

  // 4. SENIOR_MECHANIC & SENIOR_ELECTRICIAN permissions (Supervisors)
  if (role === 'SENIOR_MECHANIC' || role === 'SENIOR_ELECTRICIAN') {
    // Senior mechanics oversee floor tasks, roster, pending actions, and assets,
    // but cannot access plant settings or user accounts creation (Admin only).
    const restrictedForSupervisor = [
      '/dashboard/settings',
      '/dashboard/users',
      '/dashboard/active-tna',
    ];
    return !restrictedForSupervisor.some((r) => cleanPath === r || cleanPath.startsWith(`${r}/`));
  }

  return false;
}

export function isTechnicalRole(role?: string | null): boolean {
  return ['MECHANIC', 'SERVICE_MECHANIC', 'SENIOR_MECHANIC', 'ELECTRICIAN', 'SENIOR_ELECTRICIAN'].includes(normalizeRole(role));
}

export function canManageOperations(role?: string | null): boolean {
  return ['ADMIN', 'ASSET_MANAGER', 'HEAD_MECHANIC_MANAGER'].includes(normalizeRole(role));
}

export function canManageStaffAccount(actorRole: string, targetRole: string): boolean {
  return normalizeRole(actorRole) !== 'HEAD_MECHANIC_MANAGER' || isTechnicalRole(targetRole);
}
