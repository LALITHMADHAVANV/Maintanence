import { NextResponse } from 'next/server';
import { getDatabase, TenantError } from '@/lib/mongodb';
import { canManageOperations } from '@/lib/constants/roles';

export async function GET(request: Request) {
  try {
    const db = await getDatabase(request);
    if (!canManageOperations(db.sessionUser?.role)) return NextResponse.json({ error: 'Manage Settings permission required.' }, { status: 403 });
    const users = await db.collection('users').find({ status: { $ne: 'INACTIVE' } }, { projection: { uid: 1, name: 1, department: 1, teams: 1, email: 1, _id: 0 } }).toArray();
    const configured = await db.collection('departments').find({}, { projection: { name: 1, id: 1, _id: 0 } }).sort({ name: 1 }).toArray();
    const departments = [...new Set([
      ...configured.map((department: any) => String(department.name || '').trim()),
      ...users.map((user: any) => String(user.department || '').trim()),
    ].filter(Boolean))].sort();
    return NextResponse.json({ departments, users: users.map((user: any) => {
      const department = String(user.department || '').trim();
      const rawTeams = Array.isArray(user.teams) ? user.teams : [];
      // Legacy profiles use the department itself as a placeholder team.
      const teams = [...new Set(rawTeams.map((team: unknown) => String(team).trim()).filter((team: string) => team && team.toLowerCase() !== department.toLowerCase()))];
      return { uid: user.uid, name: user.name, email: user.email, department, teams };
    }) });
  } catch (error) {
    if (error instanceof TenantError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json({ error: 'Unable to load user directory.' }, { status: 500 });
  }
}
