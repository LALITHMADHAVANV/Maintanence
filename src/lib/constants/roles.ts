import { UserRole } from '@/types/cmms';

/**
 * Normalizes any role string (e.g. from DB, custom department name, or input casing)
 * into a standardized UserRole constant.
 */
export function normalizeRole(role?: string | null): UserRole {
  if (!role) return 'MECHANIC';
  const clean = role.trim().toUpperCase().replace(/[\s-]+/g, '_');

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

  // Admin & Asset Manager have full unrestricted access to all pages
  if (role === 'ADMIN' || role === 'ASSET_MANAGER') {
    return true;
  }

  // Root dashboard and notifications are accessible to all authenticated credentials
  if (pathname === '/dashboard' || pathname === '/dashboard/messages') {
    return true;
  }

  // 1. CEO / Executive permissions
  if (role === 'CEO') {
    const ceoAllowed = [
      '/dashboard',
      '/dashboard/messages',
      '/dashboard/asset-types',
      '/dashboard/history',
    ];
    return ceoAllowed.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  }

  // 2. STORE_PERSON permissions
  if (role === 'STORE_PERSON') {
    const storeAllowed = [
      '/dashboard',
      '/dashboard/store-inbox',
      '/dashboard/inventory',
      '/dashboard/asset-types',
      '/dashboard/history',
      '/dashboard/messages',
    ];
    return storeAllowed.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  }

  // 3. MECHANIC & ELECTRICIAN permissions (Floor Technicians)
  if (role === 'MECHANIC' || role === 'ELECTRICIAN') {
    const mechanicAllowed = [
      '/dashboard',
      '/dashboard/calendar',
      '/dashboard/inventory',
      '/dashboard/history',
      '/dashboard/messages',
    ];
    return mechanicAllowed.some((r) => pathname === r || pathname.startsWith(`${r}/`));
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
    return !restrictedForSupervisor.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  }

  return false;
}
