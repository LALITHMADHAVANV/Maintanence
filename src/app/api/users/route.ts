import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SEED_USERS } from '@/lib/seedData';
import { UserProfile, UserRole } from '@/types/cmms';

// Helper to get Supabase Admin client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceKey) {
    throw new Error('Supabase URL or Service Role Key is missing in environment variables');
  }
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  });
}

// Helper to get Supabase Anon client for public data fetching if admin not available
function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, anonKey);
}

function getDefaultTitle(role: UserRole): string {
  switch (role) {
    case 'CEO':
      return 'Chief Executive Officer (Managing Director)';
    case 'ADMIN':
    case 'ASSET_MANAGER':
      return 'Plant Administrator & Asset Director';
    case 'SENIOR_MECHANIC':
      return 'Senior Master Technician & PPM Lead';
    case 'MECHANIC':
      return 'Industrial Sewing Machine Mechanic';
    case 'SENIOR_ELECTRICIAN':
      return 'Senior Plant Electrician & Power Specialist';
    case 'ELECTRICIAN':
      return 'Industrial Plant Electrician';
    case 'STORE_PERSON':
      return 'Tool Crib & Inventory Custodian';
    default:
      return 'Factory Staff';
  }
}

// GET /api/users - Fetch all factory users from Supabase and Seed data
export async function GET() {
  try {
    const supabase = getSupabaseAnon();
    const { data: dbUsers, error } = await supabase.from('users').select('*');

    if (error) throw error;

    const fetchedUsers: UserProfile[] = (dbUsers || []).map((data: any) => ({
      uid: data.uid || data.id,
      name: data.name || 'Factory Staff',
      email: data.email || '',
      role: (data.role || 'MECHANIC') as UserRole,
      title: data.title || getDefaultTitle(data.role as UserRole || 'MECHANIC'),
      phone: data.phone || '',
      department: data.department || 'Floor Maintenance',
      employeeId: data.employee_id || `EMP-${(data.id || '').slice(0, 4)}`,
      status: data.status || 'ACTIVE',
      defaultPassword: data.default_password,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }));

    // Merge seed users if not already in DB
    const allUsersMap = new Map<string, UserProfile>();

    // Add seed users first
    SEED_USERS.forEach((su, idx) => {
      allUsersMap.set(su.email.toLowerCase(), {
        ...su,
        employeeId: su.employeeId || `EMP-00${idx + 1}`,
        phone: su.phone || '+91 98421 0000' + (idx + 1),
        department: su.department || (su.role === 'CEO' ? 'Executive Board' : su.role === 'STORE_PERSON' ? 'Tool Crib & Stores' : 'Maintenance Workshop'),
        status: 'ACTIVE',
      });
    });

    // Merge DB users
    fetchedUsers.forEach((fu) => {
      allUsersMap.set(fu.email.toLowerCase(), fu);
    });

    return NextResponse.json({
      success: true,
      users: Array.from(allUsersMap.values()),
    });
  } catch (err: unknown) {
    console.error('Error fetching users:', err);
    // Return seed users as reliable fallback
    return NextResponse.json({
      success: true,
      users: SEED_USERS,
      fallback: true,
    });
  }
}

// POST /api/users - Create new user in Supabase Auth and public.users
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, role, title, password, phone, department, employeeId } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    if (role === 'CEO') {
      return NextResponse.json(
        { error: 'Cannot create CEO accounts. Executive board role cannot be provisioned by admin.' },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanRole: UserRole = role;
    const finalTitle = title?.trim() || getDefaultTitle(cleanRole);
    const finalEmpId = employeeId?.trim() || `EMP-${Math.floor(100 + Math.random() * 900)}`;

    let uid = '';

    // 1. Try creating user in Supabase Auth via Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPass,
      email_confirm: true,
    });

    if (createError) {
      // If user already exists in Supabase Auth, attempt to find them and update
      if (createError.message.includes('already registered')) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existing = existingUsers.users.find(u => u.email === cleanEmail);
        
        if (existing) {
          uid = existing.id;
          await supabaseAdmin.auth.admin.updateUserById(uid, { password: cleanPass });
        } else {
          return NextResponse.json(
            { error: 'User email already registered but could not be located.' },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: createError.message || 'Failed to create user in Supabase Auth' },
          { status: 400 }
        );
      }
    } else if (newUser?.user) {
      uid = newUser.user.id;
    } else {
       return NextResponse.json(
          { error: 'Unknown error occurred while creating user.' },
          { status: 500 }
       );
    }

    // 2. Write full user profile to Supabase public.users
    const userPayload = {
      id: uid,
      uid,
      name: name.trim(),
      email: cleanEmail,
      role: cleanRole,
      title: finalTitle,
    };

    const { error: dbError } = await supabaseAdmin
      .from('users')
      .upsert(userPayload);

    if (dbError) {
       console.error("Database insert error:", dbError);
    }

    return NextResponse.json({
      success: true,
      message: `User ${name} (${cleanEmail}) successfully created with role ${cleanRole}!`,
      user: userPayload,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error creating user:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
