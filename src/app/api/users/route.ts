import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { UserProfile, UserRole } from '@/types/cmms';

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

const DEFAULT_USERS: Array<UserProfile & { password?: string }> = [
  {
    uid: 'CEO-01',
    name: 'Executive Board Director',
    email: 'ceo@sahana.com',
    role: 'CEO',
    title: 'Chief Executive Officer (Managing Director)',
    phone: '+91 98401 11001',
    department: 'Executive Management',
    employeeId: 'EMP-CEO-01',
    status: 'ACTIVE',
    defaultPassword: 'ceo123',
    createdAt: new Date().toISOString(),
  },
  {
    uid: 'ADM-01',
    name: 'Plant Administrator',
    email: 'admin@sahana.com',
    role: 'ADMIN',
    title: 'Plant Administrator & Asset Director',
    phone: '+91 98401 22002',
    department: 'Factory Operations',
    employeeId: 'EMP-ADM-01',
    status: 'ACTIVE',
    defaultPassword: 'admin123',
    createdAt: new Date().toISOString(),
  },
  {
    uid: 'SNR-01',
    name: 'R. Veeramani',
    email: 'seniormechanic@sahana.com',
    role: 'SENIOR_MECHANIC',
    title: 'Senior Master Technician & PPM Lead',
    phone: '+91 98401 33003',
    department: 'Maintenance Workshop',
    employeeId: 'EMP-SNR-01',
    status: 'ACTIVE',
    defaultPassword: 'senior123',
    createdAt: new Date().toISOString(),
  },
  {
    uid: 'MEC-01',
    name: 'K. Murugan',
    email: 'mechanic@sahana.com',
    role: 'MECHANIC',
    title: 'Industrial Sewing Machine Mechanic',
    phone: '+91 98401 44004',
    department: 'Sewing Floor Lines',
    employeeId: 'EMP-MEC-01',
    status: 'ACTIVE',
    defaultPassword: 'mechanic123',
    createdAt: new Date().toISOString(),
  },
  {
    uid: 'SELE-01',
    name: 'M. Senthil Kumar',
    email: 'seniorelectrician@sahana.com',
    role: 'SENIOR_ELECTRICIAN',
    title: 'Senior Plant Electrician & Power Specialist',
    phone: '+91 98401 55005',
    department: 'Electrical & Power Plant',
    employeeId: 'EMP-SELE-01',
    status: 'ACTIVE',
    defaultPassword: 'senior123',
    createdAt: new Date().toISOString(),
  },
  {
    uid: 'ELE-01',
    name: 'P. Anand',
    email: 'electrician@sahana.com',
    role: 'ELECTRICIAN',
    title: 'Industrial Plant Electrician',
    phone: '+91 98401 66006',
    department: 'Electrical & Utilities',
    employeeId: 'EMP-ELE-01',
    status: 'ACTIVE',
    defaultPassword: 'electrician123',
    createdAt: new Date().toISOString(),
  },
  {
    uid: 'STR-01',
    name: 'M. Arumugam',
    email: 'stores@sahana.com',
    role: 'STORE_PERSON',
    title: 'Tool Crib & Inventory Custodian',
    phone: '+91 98401 77007',
    department: 'Central Spare Store',
    employeeId: 'EMP-STR-01',
    status: 'ACTIVE',
    defaultPassword: 'stores123',
    createdAt: new Date().toISOString(),
  },
];

// GET /api/users - Fetch all factory users from MongoDB
export async function GET() {
  try {
    const db = await getDatabase();
    const collection = db.collection('users');
    let users = await collection.find({}).toArray();

    // If users collection is empty, seed initial factory roles
    if (users.length === 0) {
      await collection.insertMany(DEFAULT_USERS);
      users = await collection.find({}).toArray();
    }

    const fetchedUsers: UserProfile[] = users.map(({ _id, password, ...data }: any) => ({
      uid: data.uid || String(_id),
      name: data.name || 'Factory Staff',
      email: data.email || '',
      role: (data.role || 'MECHANIC') as UserRole,
      title: data.title || getDefaultTitle((data.role as UserRole) || 'MECHANIC'),
      phone: data.phone || '',
      department: data.department || 'Floor Maintenance',
      employeeId: data.employeeId || data.employee_id || `EMP-${(data.uid || '').slice(0, 4)}`,
      status: data.status || 'ACTIVE',
      defaultPassword: data.defaultPassword || data.default_password || password,
      createdAt: data.createdAt || data.created_at,
      updatedAt: data.updatedAt || data.updated_at,
    }));

    return NextResponse.json({
      success: true,
      users: fetchedUsers,
    });
  } catch (err: unknown) {
    console.error('Error fetching users from MongoDB:', err);
    return NextResponse.json({
      success: true,
      users: DEFAULT_USERS,
    });
  }
}

// POST /api/users - Create new user in MongoDB
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

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanRole: UserRole = role;
    const finalTitle = title?.trim() || getDefaultTitle(cleanRole);
    const finalEmpId = employeeId?.trim() || `EMP-${Math.floor(100 + Math.random() * 900)}`;
    const uid = `USR-${Date.now().toString(36).toUpperCase()}`;

    const db = await getDatabase();
    const collection = db.collection('users');

    // Check if email already exists
    const existing = await collection.findOne({ email: cleanEmail });
    if (existing) {
      // Update password and profile
      await collection.updateOne(
        { email: cleanEmail },
        {
          $set: {
            name: name.trim(),
            role: cleanRole,
            title: finalTitle,
            password: cleanPass,
            defaultPassword: cleanPass,
            phone: phone?.trim() || '',
            department: department?.trim() || '',
            employeeId: finalEmpId,
            updatedAt: new Date().toISOString(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: `User ${cleanEmail} profile updated!`,
      });
    }

    const newUserDoc = {
      uid,
      name: name.trim(),
      email: cleanEmail,
      role: cleanRole,
      title: finalTitle,
      password: cleanPass,
      defaultPassword: cleanPass,
      phone: phone?.trim() || '',
      department: department?.trim() || 'Floor Maintenance',
      employeeId: finalEmpId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await collection.insertOne(newUserDoc);

    return NextResponse.json({
      success: true,
      message: `User ${name} (${cleanEmail}) successfully created with role ${cleanRole}!`,
      user: {
        uid,
        name: newUserDoc.name,
        email: newUserDoc.email,
        role: newUserDoc.role,
        title: newUserDoc.title,
        employeeId: newUserDoc.employeeId,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error creating user in MongoDB:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
