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
    uid: 'ADM-01',
    name: 'Plant Administrator',
    email: 'admin@sahana.com',
    role: 'ADMIN',
    title: 'Plant Administrator & Asset Director',
    phone: '+91 98401 22002',
    department: 'Factory Operations',
    employeeId: 'EMP-ADM-01',
    unit: 'All Units',
    status: 'ACTIVE',
    defaultPassword: 'admin123',
    createdAt: new Date().toISOString(),
  },
];

// GET /api/users - Fetch all factory users from MongoDB
export async function GET(req: Request) {
  try {
    const db = await getDatabase(req);
    const collection = db.collection('users');
    let users = await collection.find({}).toArray();

    // If users collection is empty, seed only the Administrator
    if (users.length === 0) {
      await collection.insertMany(DEFAULT_USERS);
      users = await collection.find({}).toArray();
    }

    const fetchedUsers: UserProfile[] = users.map(({ _id, password, ...data }: any) => {
      const rawRole = (data.role || 'MECHANIC').toString().trim();
      const roleUpper = rawRole.toUpperCase();
      let normalizedRole: UserRole = rawRole as UserRole;
      if (roleUpper === 'STORE' || roleUpper === 'STORE PERSON' || roleUpper === 'STORE_KEEPER') {
        normalizedRole = 'STORE_PERSON';
      } else if (roleUpper === 'MECHANIC') {
        normalizedRole = 'MECHANIC';
      } else if (roleUpper === 'SENIOR_MECHANIC' || roleUpper === 'SR_MECHANIC' || roleUpper === 'SR MECHANIC') {
        normalizedRole = 'SENIOR_MECHANIC';
      } else if (roleUpper === 'ELECTRICIAN') {
        normalizedRole = 'ELECTRICIAN';
      } else if (roleUpper === 'SENIOR_ELECTRICIAN' || roleUpper === 'SR_ELECTRICIAN' || roleUpper === 'SR ELECTRICIAN') {
        normalizedRole = 'SENIOR_ELECTRICIAN';
      } else if (roleUpper === 'ADMIN') {
        normalizedRole = 'ADMIN';
      } else if (roleUpper === 'CEO') {
        normalizedRole = 'CEO';
      } else if (roleUpper === 'ASSET_MANAGER' || roleUpper === 'ASSET MANAGER') {
        normalizedRole = 'ASSET_MANAGER';
      }

      return {
        uid: data.uid || String(_id),
        name: data.name || 'Factory Staff',
        email: data.email || '',
        role: normalizedRole,
        title: data.title || getDefaultTitle(normalizedRole),
        phone: data.phone || '',
        department: data.department || 'Floor Maintenance',
        employeeId: data.employeeId || data.employee_id || `EMP-${(data.uid || '').slice(0, 4)}`,
        unit: data.unit || 'All Units',
        zones: Array.isArray(data.zones) ? data.zones : (data.zone ? [data.zone] : []),
        company: data.company || 'Sahana Garments Ltd',
        status: data.status || 'ACTIVE',
        defaultPassword: data.defaultPassword || data.default_password || password,
        createdAt: data.createdAt || data.created_at,
        updatedAt: data.updatedAt || data.updated_at,
      };
    });

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
    const { name, email, role, title, password, phone, department, employeeId, unit, zones } = body;

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

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanRole: UserRole = role;
    const finalTitle = title?.trim() || getDefaultTitle(cleanRole);
    const finalEmpId = employeeId?.trim() || `EMP-${Math.floor(100 + Math.random() * 900)}`;
    const finalUnit = unit?.trim() || 'All Units';
    const finalZones = Array.isArray(zones)
      ? zones.filter((z) => typeof z === 'string' && z.trim().length > 0)
      : [];
    const uid = `USR-${Date.now().toString(36).toUpperCase()}`;

    const db = await getDatabase(req);
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
            unit: finalUnit,
            zones: finalZones,
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
      unit: finalUnit,
      zones: finalZones,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await collection.insertOne(newUserDoc);

    return NextResponse.json({
      success: true,
      message: `User ${name} (${cleanEmail}) successfully created with role ${cleanRole} in ${finalUnit}!`,
      user: {
        uid,
        name: newUserDoc.name,
        email: newUserDoc.email,
        role: newUserDoc.role,
        title: newUserDoc.title,
        employeeId: newUserDoc.employeeId,
        unit: newUserDoc.unit,
        zones: newUserDoc.zones,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error creating user in MongoDB:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// DELETE /api/users - Delete a non-admin factory member from MongoDB
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get('email')?.trim().toLowerCase();
    const uidParam = searchParams.get('uid')?.trim();

    let targetEmail = emailParam;
    let targetUid = uidParam;

    if (!targetEmail && !targetUid) {
      try {
        const body = await req.json();
        targetEmail = body.email?.trim().toLowerCase();
        targetUid = body.uid?.trim();
      } catch {
        // no body
      }
    }

    if (!targetEmail && !targetUid) {
      return NextResponse.json({ error: 'User email or UID is required to delete' }, { status: 400 });
    }

    // Verify Admin permission
    const requesterRole = req.headers.get('x-user-role');
    if (requesterRole && requesterRole !== 'ADMIN' && requesterRole !== 'ASSET_MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized: Only Administrators have access to delete personnel records' },
        { status: 403 }
      );
    }

    // Safeguard: Never delete the primary administrator
    if (targetEmail === 'admin@sahana.com' || targetUid === 'ADM-01') {
      return NextResponse.json({ error: 'Cannot delete the primary System Administrator account' }, { status: 403 });
    }

    const db = await getDatabase(req);
    const collection = db.collection('users');

    const filter: Record<string, any> = {};
    if (targetEmail) filter.email = targetEmail;
    if (targetUid) filter.uid = targetUid;

    // Check if target user is an Admin
    const existing = await collection.findOne(filter);
    if (!existing) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    if (existing.role === 'ADMIN' && (existing.email === 'admin@sahana.com' || existing.uid === 'ADM-01')) {
      return NextResponse.json({ error: 'Cannot delete the primary System Administrator account' }, { status: 403 });
    }

    await collection.deleteOne({ _id: existing._id });

    return NextResponse.json({
      success: true,
      message: `User ${existing.name || targetEmail} removed from database`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error deleting user in MongoDB:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// PUT /api/users - Update an existing user in MongoDB
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { uid, email, name, role, title, department, phone, employeeId, unit, zones, status, password } = body;

    if (!uid && !email) {
      return NextResponse.json({ error: 'User UID or email is required to update' }, { status: 400 });
    }

    const requesterRole = req.headers.get('x-user-role');
    if (requesterRole && requesterRole !== 'ADMIN' && requesterRole !== 'ASSET_MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized: Only Administrators have permission to edit user profiles' },
        { status: 403 }
      );
    }

    const db = await getDatabase(req);
    const collection = db.collection('users');

    const filter: Record<string, any> = {};
    if (uid) filter.uid = uid;
    else if (email) filter.email = email.trim().toLowerCase();

    const existing = await collection.findOne(filter);
    if (!existing) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const isPrimaryAdmin = existing.email === 'admin@sahana.com' || existing.uid === 'ADM-01';

    // Prevent demoting primary admin
    const updatedRole = role ? (role as UserRole) : (existing.role as UserRole);
    if (isPrimaryAdmin && updatedRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'The primary Administrator account cannot be assigned a different role' },
        { status: 400 }
      );
    }

    const updateDoc: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updateDoc.name = name.trim();
    if (role !== undefined) updateDoc.role = updatedRole;
    if (title !== undefined) updateDoc.title = title.trim();
    if (department !== undefined) updateDoc.department = department.trim();
    if (phone !== undefined) updateDoc.phone = phone.trim();
    if (employeeId !== undefined) updateDoc.employeeId = employeeId.trim();
    if (unit !== undefined) updateDoc.unit = unit.trim();
    if (zones !== undefined) {
      updateDoc.zones = Array.isArray(zones)
        ? zones.filter((z) => typeof z === 'string' && z.trim().length > 0)
        : [];
    }
    if (status !== undefined) updateDoc.status = status;

    // Optional email change (prevent duplicate email)
    if (email && email.trim().toLowerCase() !== existing.email) {
      const cleanEmail = email.trim().toLowerCase();
      if (isPrimaryAdmin) {
        return NextResponse.json(
          { error: 'Primary Administrator email cannot be changed' },
          { status: 400 }
        );
      }
      const duplicate = await collection.findOne({ email: cleanEmail, _id: { $ne: existing._id } });
      if (duplicate) {
        return NextResponse.json({ error: 'Email is already in use by another user' }, { status: 400 });
      }
      updateDoc.email = cleanEmail;
    }

    // Optional password update
    if (password && password.trim()) {
      if (password.trim().length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
      }
      updateDoc.password = password.trim();
      updateDoc.defaultPassword = password.trim();
    }

    await collection.updateOne({ _id: existing._id }, { $set: updateDoc });

    const updatedUser = await collection.findOne({ _id: existing._id });

    return NextResponse.json({
      success: true,
      message: `User ${updatedUser?.name || 'profile'} updated successfully!`,
      user: {
        uid: updatedUser?.uid,
        name: updatedUser?.name,
        email: updatedUser?.email,
        role: updatedUser?.role,
        title: updatedUser?.title,
        department: updatedUser?.department,
        phone: updatedUser?.phone,
        employeeId: updatedUser?.employeeId,
        unit: updatedUser?.unit,
        status: updatedUser?.status,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error updating user in MongoDB:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

